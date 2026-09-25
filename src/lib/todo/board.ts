import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/db/db";
import { todoLinks, todoNotes } from "@/db/schema";
import type { LinkRow, NoteRow } from "@/app/admin/todo/TodoBoard";

export async function loadBoard(): Promise<{
  notes: NoteRow[];
  links: LinkRow[];
}> {
  const [notes, links] = await Promise.all([
    db.select().from(todoNotes).orderBy(asc(todoNotes.createdAt)),
    db.select().from(todoLinks),
  ]);
  return {
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      color: n.color,
      x: n.x,
      y: n.y,
      width: n.width,
      updatedAt: n.updatedAt.toISOString(),
    })),
    links: links.map((l) => ({
      id: l.id,
      sourceId: l.sourceId,
      targetId: l.targetId,
    })),
  };
}
