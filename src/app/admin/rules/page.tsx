import { db } from "@/db/db";
import { rules } from "@/db/schema";
import { asc, count, ilike } from "drizzle-orm";
import { RulesClient } from "./RulesClient";

const PAGE_SIZE = 20;

interface RulesPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function RulesPage({ searchParams }: RulesPageProps) {
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
  const whereClause = search ? ilike(rules.name, `%${search}%`) : undefined;

  const [allRules, totalResult] = await Promise.all([
    db
      .select()
      .from(rules)
      .where(whereClause)
      .orderBy(asc(rules.priority), asc(rules.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(rules).where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  const serializedRules = allRules.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <RulesClient
      rules={serializedRules}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
