import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { WardrobesClient } from "./WardrobesClient";

const PAGE_SIZE = 20;

interface WardrobesPageProps {
  searchParams?: Promise<{ page?: string | string[] }> | { page?: string | string[] };
}

export default async function WardrobesPage({
  searchParams,
}: WardrobesPageProps) {
  // Layout already checks admin access
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const page = Math.max(Number(pageParam) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;

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
      .orderBy(desc(wardrobes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(wardrobes),
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
    />
  );
}
