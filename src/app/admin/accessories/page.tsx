import Link from "next/link";
import { db } from "@/db/db";
import {
  accessories,
  accessoryVariants,
  handleFinishes,
  handles,
} from "@/db/schema";
import { asc, count, ilike, eq } from "drizzle-orm";
import { AccessoriesClient } from "./AccessoriesClient";
import { HandlesClient } from "../handles/HandlesClient";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
type OkovTab = "accessories" | "handles";

interface AccessoriesPageProps {
  searchParams?:
    | Promise<{
        page?: string | string[];
        search?: string | string[];
        tab?: string | string[];
      }>
    | {
        page?: string | string[];
        search?: string | string[];
        tab?: string | string[];
      };
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
  const tabParam = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams.tab;

  const tab: OkovTab = tabParam === "handles" ? "handles" : "accessories";

  const page = Math.max(Number(pageParam) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = searchParam?.trim() || "";

  if (tab === "handles") {
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
          finishes: finishes.map((finish) => ({
            ...finish,
            createdAt: finish.createdAt.toISOString(),
            updatedAt: finish.updatedAt.toISOString(),
          })),
        };
      }),
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Okov</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Ručke, šarke, klizači i ostali elementi na jednom mestu
            </p>
          </div>
          <Link
            href="/admin/handles/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Dodaj ručku
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/accessories"
            className={cn(
              "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium",
              "border-border bg-background hover:bg-muted",
            )}
          >
            Ostali okov
          </Link>
          <Link
            href="/admin/accessories?tab=handles"
            className={cn(
              "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium",
              "border-primary bg-primary text-primary-foreground",
            )}
          >
            Ručke vrata
          </Link>
        </div>

        <HandlesClient
          handles={handlesWithFinishes}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          search={search}
          showHeader={false}
        />
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Okov</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ručke, šarke, klizači i ostali elementi na jednom mestu
          </p>
        </div>
        <Link
          href="/admin/accessories/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Dodaj okov
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/accessories"
          className={cn(
            "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium",
            "border-primary bg-primary text-primary-foreground",
          )}
        >
          Ostali okov
        </Link>
        <Link
          href="/admin/accessories?tab=handles"
          className={cn(
            "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium",
            "border-border bg-background hover:bg-muted",
          )}
        >
          Ručke vrata
        </Link>
      </div>

      <AccessoriesClient
        accessories={accessoriesWithVariants}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        search={search}
        showHeader={false}
      />
    </div>
  );
}
