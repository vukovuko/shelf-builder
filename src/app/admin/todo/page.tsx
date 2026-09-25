import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/roles";
import { loadBoard } from "@/lib/todo/board";
import { TodoBoard } from "./TodoBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zadaci | Admin" };

export default async function TodoPage() {
  await requireAdminPage();
  const { notes, links } = await loadBoard();

  return (
    // Edge to edge under the admin header: the board is the whole page.
    <div className="-m-4 sm:-m-6 h-[calc(100svh-3.5rem)]">
      <TodoBoard initialNotes={notes} initialLinks={links} />
    </div>
  );
}
