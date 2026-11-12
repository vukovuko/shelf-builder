import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { companySettings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getCurrentUser, isAdmin, requireAdmin } from "@/lib/roles";
import { loadBoard } from "@/lib/todo/board";
import { TODO_ORIGIN } from "@/lib/todo/host";

export type AdminAccess = "ok" | "signed-out" | "forbidden";

/** Whether the visitor may open the admin at all; the layout acts on it. */
export async function loadAdminAccess(): Promise<AdminAccess> {
  const current = await getCurrentUser();
  if (!current) return "signed-out";
  return isAdmin(current.role) ? "ok" : "forbidden";
}

const EMPTY_SETTINGS = {
  companyName: "",
  companyAddress: "",
  companyCity: "",
  companyPostalCode: "",
  pib: "",
  mb: "",
  bankAccount: "",
  paymentCode: "289",
  contactPhone: "",
  contactEmail: "",
};

export async function loadCompanySettings() {
  await requireAdmin();
  const [settings] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);
  return settings ?? EMPTY_SETTINGS;
}

export async function loadTodoBoard() {
  await requireAdmin();
  return loadBoard();
}

/** Hands this admin's login over to the to-do board's own host (see lib/todo/host). */
export async function todoHostSignInUrl() {
  await requireAdmin();
  const { token } = await auth.api.generateOneTimeToken({
    headers: getRequestHeaders() as unknown as Headers,
  });
  return `${TODO_ORIGIN}/todo-auth?token=${encodeURIComponent(token)}`;
}
