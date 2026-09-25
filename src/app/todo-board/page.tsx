import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TodoBoard } from "@/app/admin/todo/TodoBoard";
import { getCurrentUser, isAdmin } from "@/lib/roles";
import { loadBoard } from "@/lib/todo/board";
import { MAIN_ORIGIN, TODO_HOST } from "@/lib/todo/host";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zadaci | Ormani po meri",
  robots: { index: false, follow: false },
};

// The home page of todo.ormanipomeri.com (next.config rewrites "/" here).
export default async function TodoHostPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.role)) {
    const onTodoHost = (await headers()).get("host") === TODO_HOST;
    redirect(onTodoHost ? `${MAIN_ORIGIN}/admin/todo/otvori` : "/admin/todo");
  }
  const { notes, links } = await loadBoard();

  return (
    <div className="h-svh">
      <TodoBoard initialNotes={notes} initialLinks={links} />
    </div>
  );
}
