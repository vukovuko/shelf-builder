"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  type BoardActions,
  BoardActionsContext,
  COLOR_STYLES,
  type NoteColor,
  NoteNode,
  type NoteNodeType,
} from "./NoteNode";

export type NoteRow = {
  id: string;
  body: string;
  color: string;
  x: number;
  y: number;
  width: number;
  updatedAt: string;
};
export type LinkRow = { id: string; sourceId: string; targetId: string };

const nodeTypes = { note: NoteNode };
const POLL_MS = 15_000;

function toNode(n: NoteRow): NoteNodeType {
  return {
    id: n.id,
    type: "note",
    position: { x: n.x, y: n.y },
    width: n.width,
    dragHandle: ".note-drag",
    data: {
      body: n.body,
      color: (n.color in COLOR_STYLES ? n.color : "yellow") as NoteColor,
      updatedAt: n.updatedAt,
    },
  };
}

function toEdge(l: LinkRow): Edge {
  return {
    id: l.id,
    source: l.sourceId,
    target: l.targetId,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  };
}

type SaveState = "saved" | "saving" | "error";

function Board({
  initialNotes,
  initialLinks,
}: {
  initialNotes: NoteRow[];
  initialLinks: LinkRow[];
}) {
  const { screenToFlowPosition } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<NoteNodeType>(
    initialNotes.map(toNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialLinks.map(toEdge),
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const pending = useRef(0);
  // Notes the other admin's changes must not overwrite right now.
  const busy = useRef(new Set<string>());

  const request = useCallback(
    async (method: string, url: string, body?: unknown) => {
      pending.current += 1;
      setSaveState("saving");
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) throw new Error(String(res.status));
        pending.current -= 1;
        if (pending.current === 0) setSaveState("saved");
        return res.status === 204 ? null : res.json();
      } catch {
        pending.current -= 1;
        setSaveState("error");
        toast.error(
          "Čuvanje nije uspelo. Proverite internet i pokušajte ponovo.",
        );
        return null;
      }
    },
    [],
  );

  const actions = useMemo<BoardActions>(
    () => ({
      update: (id, patch) => {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === id
              ? {
                  ...n,
                  width: patch.width ?? n.width,
                  data: {
                    ...n.data,
                    ...(patch.body !== undefined && { body: patch.body }),
                    ...(patch.color && { color: patch.color }),
                    updatedAt: new Date().toISOString(),
                  },
                }
              : n,
          ),
        );
        request("PATCH", `/api/admin/todo/${id}`, patch);
      },
      setEditing: (id, editing) => {
        if (editing) busy.current.add(id);
        else busy.current.delete(id);
        setNodes((ns) =>
          ns.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, editing } } : n,
          ),
        );
      },
      remove: (id) => {
        setNodes((ns) => ns.filter((n) => n.id !== id));
        setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
        request("DELETE", `/api/admin/todo/${id}`);
      },
    }),
    [request, setNodes, setEdges],
  );

  const addNote = useCallback(
    (x: number, y: number) => {
      const note: NoteRow = {
        id: crypto.randomUUID(),
        body: "",
        color: "yellow",
        x: Math.round(x),
        y: Math.round(y),
        width: 320,
        updatedAt: new Date().toISOString(),
      };
      busy.current.add(note.id);
      const node = toNode(note);
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { ...node, selected: true, data: { ...node.data, editing: true } },
      ]);
      request("POST", "/api/admin/todo", {
        id: note.id,
        body: "",
        color: "yellow",
        x: note.x,
        y: note.y,
        width: note.width,
      });
    },
    [request, setNodes],
  );

  const addAtCenter = () => {
    const pos = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNote(pos.x - 160, pos.y - 60);
  };

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const link: LinkRow = {
        id: crypto.randomUUID(),
        sourceId: c.source,
        targetId: c.target,
      };
      setEdges((es) => [...es, toEdge(link)]);
      request("POST", "/api/admin/todo/links", link);
    },
    [request, setEdges],
  );

  // Other admins' edits arrive every 15 s while this tab is visible; notes
  // being edited or dragged here keep the local version.
  useEffect(() => {
    const sync = async () => {
      if (document.visibilityState !== "visible" || pending.current > 0) return;
      const res = await fetch("/api/admin/todo").catch(() => null);
      if (!res?.ok) return;
      const { notes, links } = (await res.json()) as {
        notes: NoteRow[];
        links: LinkRow[];
      };
      setNodes((local) => {
        const byId = new Map(local.map((n) => [n.id, n]));
        return notes.map((row) => {
          const mine = byId.get(row.id);
          if (!mine) return toNode(row);
          if (busy.current.has(row.id) || mine.dragging) return mine;
          if (new Date(row.updatedAt) <= new Date(mine.data.updatedAt))
            return mine;
          return { ...toNode(row), selected: mine.selected };
        });
      });
      setEdges(links.map(toEdge));
    };
    const id = window.setInterval(sync, POLL_MS);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", sync);
    };
  }, [setNodes, setEdges]);

  return (
    <BoardActionsContext.Provider value={actions}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={(_, node) => busy.current.add(node.id)}
        onNodeDragStop={(_, node) => {
          if (!node.data.editing) busy.current.delete(node.id);
          request("PATCH", `/api/admin/todo/${node.id}`, {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
          });
        }}
        // The keyboard only removes arrows; notes go through their menu,
        // which asks first.
        onBeforeDelete={async ({ edges: gone }) => ({ nodes: [], edges: gone })}
        onEdgesDelete={(gone) => {
          for (const e of gone)
            request("DELETE", `/api/admin/todo/links?id=${e.id}`);
        }}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).classList.contains("react-flow__pane"))
            return;
          const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          addNote(pos.x - 160, pos.y - 20);
        }}
        zoomOnDoubleClick={false}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
        <Controls showInteractive={false} />
        {/* On a phone the overview would cover a third of the board. */}
        <MiniMap
          className="max-sm:hidden!"
          pannable
          zoomable
          nodeColor={(n) =>
            ({
              yellow: "#fcd34d",
              green: "#6ee7b7",
              blue: "#7dd3fc",
              pink: "#f9a8d4",
              purple: "#c4b5fd",
              gray: "#d4d4d8",
            })[(n.data as { color?: string }).color ?? "yellow"] ?? "#fcd34d"
          }
        />
        <Panel position="top-left" className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={addAtCenter}
            title="Nova beleška (ili dupli klik na prazno mesto)"
          >
            <Plus className="size-4" />
            Nova beleška
          </Button>
          <span
            className={
              saveState === "error"
                ? "text-destructive text-xs"
                : "text-muted-foreground text-xs"
            }
          >
            {saveState === "saving"
              ? "Čuvam…"
              : saveState === "error"
                ? "Nije sačuvano"
                : "Sačuvano"}
          </span>
        </Panel>
      </ReactFlow>
    </BoardActionsContext.Provider>
  );
}

export function TodoBoard(props: {
  initialNotes: NoteRow[];
  initialLinks: LinkRow[];
}) {
  return (
    <ReactFlowProvider>
      <Board {...props} />
    </ReactFlowProvider>
  );
}
