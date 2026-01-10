import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { user } from "@/db/schema";

/**
 * Find a user by email address
 */
export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return result[0];
}

/**
 * Find a user by ID
 */
export async function findUserById(userId: string) {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0];
}
