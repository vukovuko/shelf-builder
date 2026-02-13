import { db } from "@/db/db";
import { accessories, accessoryVariants } from "@/db/schema";
import { asc, count, ilike, eq } from "drizzle-orm";
import { AccessoriesClient } from "./AccessoriesClient";

const PAGE_SIZE = 20;

interface AccessoriesPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function AccessoriesPage({
  searchParams,
}: AccessoriesPageProps) {
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

  const whereClause = search
    ? ilike(accessories.name, `%${search}%`)
    : undefined;

  const [allAccessories, totalResult] = await Promise.all([
    db
      .select()
      .from(accessories)
      .where(whereClause)
      .orderBy(asc(accessories.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(accessories).where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  const accessoriesWithVariants = await Promise.all(
    allAccessories.map(async (accessory) => {
      const variants = await db
        .select()
        .from(accessoryVariants)
        .where(eq(accessoryVariants.accessoryId, accessory.id));

      return {
        ...accessory,
        createdAt: accessory.createdAt.toISOString(),
        updatedAt: accessory.updatedAt.toISOString(),
        variants: variants.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
      };
    }),
  );

  return (
    <AccessoriesClient
      accessories={accessoriesWithVariants}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
