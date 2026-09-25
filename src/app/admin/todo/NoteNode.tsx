"use client";

import {
  Handle,
  type Node,
  NodeResizeControl,
  type NodeProps,
  Position,
} from "@xyflow/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NOTE_COLORS } from "@/lib/todo/api";
import {
  linkify,
  noteProgress,
  noteTitle,
  parseNote,
  toggleCheck,
} from "@/lib/todo/note-text";
import { cn } from "@/lib/utils";

export type NoteColor = (typeof NOTE_COLORS)[number];
export type NoteData = {
  body: string;
  color: NoteColor;
  updatedAt: string;
  editing?: boolean;
};
export type NoteNodeType = Node<NoteData, "note">;

export type BoardActions = {
  update: (
    id: string,
    patch: { body?: string; color?: NoteColor; width?: number },
  ) => void;
  setEditing: (id: string, editing: boolean) => void;
  remove: (id: string) => void;
};
export const BoardActionsContext = createContext<BoardActions | null>(null);

export const COLOR_STYLES: Record<NoteColor, { card: string; dot: string }> = {
  yellow: {
    card: "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900",
    dot: "bg-amber-300",
  },
  green: {
    card: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900",
    dot: "bg-emerald-300",
  },
  blue: {
    card: "bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:border-sky-900",
    dot: "bg-sky-300",
  },
  pink: {
    card: "bg-pink-50 border-pink-200 dark:bg-pink-950/50 dark:border-pink-900",
    dot: "bg-pink-300",
  },
  purple: {
    card: "bg-violet-50 border-violet-200 dark:bg-violet-950/50 dark:border-violet-900",
    dot: "bg-violet-300",
  },
  gray: {
    card: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700",
    dot: "bg-zinc-300",
  },
};

const COLOR_NAMES: Record<NoteColor, string> = {
  yellow: "Žuta",
  green: "Zelena",
  blue: "Plava",
  pink: "Roze",
  purple: "Ljubičasta",
  gray: "Siva",
};

function LineText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <a
            key={i}
            href={seg.href}
            target={seg.kind === "url" ? "_blank" : undefined}
            rel={seg.kind === "url" ? "noreferrer" : undefined}
            className="nodrag text-primary underline underline-offset-2"
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {seg.text}
          </a>
        ),
      )}
    </>
  );
}

function NoteBody({ id, body }: { id: string; body: string }) {
  const actions = useContext(BoardActionsContext);
  if (!body.trim()) {
    return <p className="text-muted-foreground text-sm italic">Prazno</p>;
  }
  const lines = parseNote(body);
  // The header already shows the note's title, so a leading heading would
  // print it twice.
  const first = lines.findIndex((l) => l.kind !== "blank");
  const skip = lines[first]?.kind === "heading" ? first : -1;
  if (lines.every((l, i) => l.kind === "blank" || i === skip)) {
    return <p className="text-muted-foreground text-sm italic">Prazno</p>;
  }
  return (
    <div className="space-y-1 text-sm leading-snug">
      {lines.map((line, i) => {
        if (i <= skip) return null;
        if (line.kind === "blank") return <div key={i} className="h-2" />;
        const pad = { paddingLeft: `${line.depth * 16}px` };
        if (line.kind === "heading") {
          return (
            <p
              key={i}
              className={cn(
                "font-semibold",
                line.depth === 1 ? "text-base" : "text-sm",
              )}
            >
              <LineText text={line.text} />
            </p>
          );
        }
        if (line.kind === "check") {
          return (
            <label
              key={i}
              className="nodrag flex cursor-pointer items-start gap-2"
              style={pad}
            >
              <input
                type="checkbox"
                checked={line.done}
                onChange={() =>
                  actions?.update(id, { body: toggleCheck(body, line.index) })
                }
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span
                className={cn(
                  line.done && "text-muted-foreground line-through",
                )}
              >
                <LineText text={line.text} />
              </span>
            </label>
          );
        }
        if (line.kind === "bullet") {
          return (
            <div key={i} className="flex gap-2" style={pad}>
              <span className="text-muted-foreground">•</span>
              <span>
                <LineText text={line.text} />
              </span>
            </div>
          );
        }
        return (
          <p key={i} style={pad}>
            <LineText text={line.text} />
          </p>
        );
      })}
    </div>
  );
}

function NoteEditor({ id, body }: { id: string; body: string }) {
  const actions = useContext(BoardActionsContext);
  const [draft, setDraft] = useState(body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Grow with the text instead of scrolling inside the note.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const finish = () => {
    if (timer.current) clearTimeout(timer.current);
    if (draft !== body) actions?.update(id, { body: draft });
    actions?.setEditing(id, false);
  };

  return (
    <textarea
      ref={ref}
      value={draft}
      onChange={(e) => {
        const value = e.target.value;
        setDraft(value);
        // Save while typing too, so a closed tab loses at most a second.
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(
          () => actions?.update(id, { body: value }),
          700,
        );
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (
          e.key === "Escape" ||
          (e.key === "Enter" && (e.metaKey || e.ctrlKey))
        )
          finish();
      }}
      placeholder={"# Naslov\n- [ ] zadatak\n- beleška"}
      className="nodrag nowheel nopan w-full resize-none bg-transparent font-mono text-[13px] leading-snug outline-none"
      rows={3}
    />
  );
}

export function NoteNode({ id, data, selected }: NodeProps<NoteNodeType>) {
  const actions = useContext(BoardActionsContext);
  const title = noteTitle(data.body) || "Bez naslova";
  const { done, total } = noteProgress(data.body);
  const style = COLOR_STYLES[data.color] ?? COLOR_STYLES.yellow;

  return (
    <div
      className={cn(
        "group rounded-xl border shadow-sm transition-shadow",
        style.card,
        selected && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      <NodeResizeControl
        position="right"
        minWidth={220}
        maxWidth={900}
        resizeDirection="horizontal"
        onResizeEnd={(_, params) =>
          actions?.update(id, { width: Math.round(params.width) })
        }
        style={{ background: "transparent", border: "none" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !bg-background opacity-0 transition-opacity group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !bg-background opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="note-drag flex cursor-grab items-center gap-2 border-black/5 border-b px-3 py-2 active:cursor-grabbing dark:border-white/10">
        <span className="min-w-0 flex-1 truncate font-medium text-sm">
          {title}
        </span>
        {total > 0 && (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] tabular-nums dark:bg-white/10">
            {done}/{total}
          </span>
        )}
        <button
          type="button"
          aria-label="Izmeni"
          onClick={() => actions?.setEditing(id, true)}
          className="nodrag rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <Pencil className="size-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Opcije beleške"
              className="nodrag rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(COLOR_STYLES) as NoteColor[]).map((c) => (
              <DropdownMenuItem
                key={c}
                onSelect={() => actions?.update(id, { color: c })}
              >
                <span
                  className={cn("size-3 rounded-full", COLOR_STYLES[c].dot)}
                />
                {COLOR_NAMES[c]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                if (window.confirm(`Obrisati belešku „${title}“?`))
                  actions?.remove(id);
              }}
            >
              <Trash2 className="size-3.5" />
              Obriši
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click opens the editor, same as the pencil button */}
      <div
        className="px-3 py-2.5"
        onDoubleClick={() => {
          if (!data.editing) actions?.setEditing(id, true);
        }}
      >
        {data.editing ? (
          <NoteEditor id={id} body={data.body} />
        ) : (
          <NoteBody id={id} body={data.body} />
        )}
      </div>
    </div>
  );
}
