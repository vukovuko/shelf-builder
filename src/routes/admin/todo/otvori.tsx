import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTodoHostSignInUrl } from "@/server/admin/admin.functions";

// Opens the to-do board on its own host, already signed in.
export const Route = createFileRoute("/admin/todo/otvori")({
  loader: async () => {
    throw redirect({ href: await getTodoHostSignInUrl() });
  },
});
