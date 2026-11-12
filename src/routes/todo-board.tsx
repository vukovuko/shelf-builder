import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { NOINDEX } from "@/lib/seo/site";
import { MAIN_ORIGIN, TODO_HOST } from "@/lib/todo/host";
import {
  adminTodoBoardQuery,
  freshAdminAccess,
} from "@/server/admin/admin.functions";

const TodoBoard = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/todo/TodoBoard").then((module) => ({
        default: module.TodoBoard,
      })),
    );

// The whole of todo.ormanipomeri.com (the router shows this route at "/"
// there). Drawn in the browser only, like the admin.
export const Route = createFileRoute("/todo-board")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    if ((await freshAdminAccess(context.queryClient)) === "ok") return;
    // This host has its own login cookie. The main site hands one over to a
    // signed-in admin, or asks the visitor to sign in first.
    throw redirect({
      href:
        window.location.host === TODO_HOST
          ? `${MAIN_ORIGIN}/admin/todo/otvori`
          : "/admin/todo",
    });
  },
  loader: ({ context }) => context.queryClient.fetchQuery(adminTodoBoardQuery),
  head: () => ({
    meta: [{ title: "Zadaci | Ormani po meri" }, ...NOINDEX],
  }),
  component: TodoHostPage,
});

function TodoHostPage() {
  const { notes, links } = Route.useLoaderData();
  return (
    <div className="h-svh">
      <Suspense fallback={null}>
        {TodoBoard && <TodoBoard initialNotes={notes} initialLinks={links} />}
      </Suspense>
    </div>
  );
}
