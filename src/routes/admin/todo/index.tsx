import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminTodoBoardQuery } from "@/server/admin/admin.functions";

const TodoBoard = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/todo/TodoBoard").then((module) => ({
        default: module.TodoBoard,
      })),
    );

export const Route = createFileRoute("/admin/todo/")({
  loader: ({ context }) => context.queryClient.fetchQuery(adminTodoBoardQuery),
  head: () => ({ meta: [{ title: "Zadaci | Admin" }] }),
  component: TodoPage,
});

function TodoPage() {
  const { notes, links } = Route.useLoaderData();
  return (
    <div className="admin-full-bleed h-[calc(100svh-3.5rem)]">
      {TodoBoard && <TodoBoard initialNotes={notes} initialLinks={links} />}
    </div>
  );
}
