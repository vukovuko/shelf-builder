import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireAdminPage } from "@/lib/roles";
import { TODO_ORIGIN } from "@/lib/todo/host";

export const dynamic = "force-dynamic";

// Hands this admin's login over to todo.ormanipomeri.com (see lib/todo/host).
export default async function OpenOnTodoHost() {
  await requireAdminPage();
  const { token } = await auth.api.generateOneTimeToken({
    headers: await headers(),
  });
  redirect(`${TODO_ORIGIN}/todo-auth?token=${encodeURIComponent(token)}`);
}
