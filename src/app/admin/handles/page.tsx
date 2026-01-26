import { db } from "@/db/db";
import { handles, handleFinishes } from "@/db/schema";
import { asc, count, ilike, eq } from "drizzle-orm";
import { HandlesClient } from "./HandlesClient";

const PAGE_SIZE = 20;

interface HandlesPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function HandlesPage({ searchParams }: HandlesPageProps) {
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

  // Build where clause for search
  const whereClause = search ? ilike(handles.name, `%${search}%`) : undefined;

  const [allHandles, totalResult] = await Promise.all([
    db
      .select()
      .from(handles)
      .where(whereClause)
      .orderBy(asc(handles.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(handles).where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  // Fetch finishes for each handle
  const handlesWithFinishes = await Promise.all(
    allHandles.map(async (handle) => {
      const finishes = await db
        .select()
        .from(handleFinishes)
        .where(eq(handleFinishes.handleId, handle.id));

      return {
        ...handle,
        createdAt: handle.createdAt.toISOString(),
        updatedAt: handle.updatedAt.toISOString(),
        finishes: finishes.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
      };
    }),
  );

  return (
    <HandlesClient
      handles={handlesWithFinishes}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
