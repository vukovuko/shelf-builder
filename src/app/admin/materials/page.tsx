import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { asc, count, ilike } from "drizzle-orm";
import { MaterialsClient } from "./MaterialsClient";

const PAGE_SIZE = 20;

interface MaterialsPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function MaterialsPage({
  searchParams,
}: MaterialsPageProps) {
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
  const whereClause = search ? ilike(materials.name, `%${search}%`) : undefined;

  const [allMaterials, totalResult] = await Promise.all([
    db
      .select()
      .from(materials)
      .where(whereClause)
      .orderBy(asc(materials.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(materials).where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  const serializedMaterials = allMaterials.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <MaterialsClient
      materials={serializedMaterials}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
