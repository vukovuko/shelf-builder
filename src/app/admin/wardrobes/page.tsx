import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { WardrobesClient } from "./WardrobesClient";

const PAGE_SIZE = 20;

interface WardrobesPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function WardrobesPage({
  searchParams,
}: WardrobesPageProps) {
  // Layout already checks admin access
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const searchParam = Array.isArray(resolvedSearchParams.search)
    ? resolvedSearchParams.search[0]
    : resolvedSearchParams.search;

  const page = Math.max(Number(pageParam) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = searchParam?.trim() || "";

  // Search by wardrobe name or user name/email
  const whereClause = search
    ? or(
        ilike(wardrobes.name, `%${search}%`),
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
      )
    : undefined;

  const [allWardrobes, totalResult] = await Promise.all([
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
        userId: wardrobes.userId,
        userName: user.name,
        userEmail: user.email,
      })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(whereClause)
      .orderBy(desc(wardrobes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  // Convert dates to strings for serialization
  const serializedWardrobes = allWardrobes.map((w) => ({
    ...w,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return (
    <WardrobesClient
      wardrobes={serializedWardrobes}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
