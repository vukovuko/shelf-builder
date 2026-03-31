import { asc, count, ilike } from "drizzle-orm";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import { RulesClient } from "./RulesClient";

const PAGE_SIZE = 20;

interface AccessoryRulesPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function AccessoryRulesPage({
  searchParams,
}: AccessoryRulesPageProps) {
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
    ? ilike(accessoryRules.name, `%${search}%`)
    : undefined;

  const [allRules, totalResult] = await Promise.all([
    db
      .select()
      .from(accessoryRules)
      .where(whereClause)
      .orderBy(asc(accessoryRules.priority), asc(accessoryRules.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(accessoryRules).where(whereClause),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);
  const serializedRules = allRules.map((rule) => ({
    ...rule,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
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