import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

// Role types - expandable
export type Role = "user" | "admin";

// Check if user has a specific role
export function hasRole(userRole: string | undefined | null, role: Role): boolean {
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
