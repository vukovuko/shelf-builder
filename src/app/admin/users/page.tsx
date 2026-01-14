import { db } from "@/db/db";
import { user } from "@/db/schema";
import { desc } from "drizzle-orm";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  // Layout already checks admin access
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  // Convert dates to strings for serialization
  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersClient users={serializedUsers} />;
}
