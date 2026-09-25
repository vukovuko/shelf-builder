import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { auth } from "./auth";
import { signInUrl } from "./return-to";

// Role types - expandable
export type Role = "user" | "admin";

// Check if user has a specific role
export function hasRole(
  userRole: string | undefined | null,
  role: Role,
): boolean {
  return userRole === role;
}

// Check if user is admin
export function isAdmin(userRole: string | undefined | null): boolean {
  return hasRole(userRole, "admin");
}

// Get current user with role (server-side)
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  // Fetch full user with role from database
  const dbUser = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return dbUser[0] ?? null;
}

// Check if current user is admin (server-side)
export async function isCurrentUserAdmin(): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return isAdmin(currentUser?.role);
}

// Require admin role - throws redirect if not admin
export async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isAdmin(currentUser.role)) {
    throw new Error("FORBIDDEN");
  }

  return currentUser;
}

// Set user role (admin only operation)
export async function setUserRole(userId: string, role: Role) {
  await db.update(user).set({ role }).where(eq(user.id, userId));
}

/**
 * Admin gate for admin pages. The admin layout's check does not re-run on
 * every navigation, so each page that renders admin data checks for itself.
 * Signed out: to sign-in, then back here (the proxy supplies the path).
 * Signed in without the admin role: home, as if the page didn't exist.
 */
export async function requireAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(signInUrl((await headers()).get("x-return-to")));
  }
  if (!isAdmin(currentUser.role)) redirect("/");
  return currentUser;
}
