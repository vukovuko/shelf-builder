"use server";

import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if the current user's email is verified
 * Returns null if not logged in, boolean otherwise
 */
export async function isEmailVerified(): Promise<boolean | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const dbUser = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return dbUser[0]?.emailVerified ?? false;
}
