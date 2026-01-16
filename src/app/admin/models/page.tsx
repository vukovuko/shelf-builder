import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { ModelsClient } from "./ModelsClient";

const PAGE_SIZE = 20;

interface ModelsPageProps {
  searchParams?:
    | Promise<{ page?: string | string[]; search?: string | string[] }>
    | { page?: string | string[]; search?: string | string[] };
}

export default async function ModelsPage({ searchParams }: ModelsPageProps) {
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

  // Filter: isModel=true, and optionally search by name or user
  const baseCondition = eq(wardrobes.isModel, true);
  const searchCondition = search
    ? or(
        ilike(wardrobes.name, `%${search}%`),
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
      )
    : undefined;

  const whereClause = searchCondition
    ? and(baseCondition, searchCondition)
    : baseCondition;

  const [allModels, totalResult] = await Promise.all([
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
        publishedModel: wardrobes.publishedModel,
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

  const serializedModels = allModels.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <ModelsClient
      models={serializedModels}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
      search={search}
    />
  );
}
