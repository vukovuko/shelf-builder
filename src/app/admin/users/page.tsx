import { db } from "@/db/db";
import { user } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import { UsersClient } from "./UsersClient";

const PAGE_SIZE = 20;

interface UsersPageProps {
  searchParams?: Promise<{ page?: string | string[] }> | { page?: string | string[] };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  // Layout already checks admin access
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const page = Math.max(Number(pageParam) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [users, totalResult] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(user),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  // Convert dates to strings for serialization
  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <UsersClient
      users={serializedUsers}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
    />
  );
}
