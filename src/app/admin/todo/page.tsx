import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db/db";
import { todoLinks, todoNotes } from "@/db/schema";
import { requireAdminPage } from "@/lib/roles";
import { TodoBoard } from "./TodoBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zadaci | Admin" };

export default async function TodoPage() {
  await requireAdminPage();
  const [notes, links] = await Promise.all([
    db.select().from(todoNotes).orderBy(asc(todoNotes.createdAt)),
    db.select().from(todoLinks),
  ]);

  return (
    // Edge to edge under the admin header: the board is the whole page.
    <div className="-m-4 sm:-m-6 h-[calc(100svh-3.5rem)]">
      <TodoBoard
        initialNotes={notes.map((n) => ({
          id: n.id,
          body: n.body,
          color: n.color,
          x: n.x,
          y: n.y,
          width: n.width,
          updatedAt: n.updatedAt.toISOString(),
        }))}
        initialLinks={links.map((l) => ({
          id: l.id,
          sourceId: l.sourceId,
          targetId: l.targetId,
        }))}
      />
    </div>
  );
}
