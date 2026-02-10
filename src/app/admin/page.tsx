import { getCurrentUser } from "@/lib/roles";
import { AdminDashboard } from "./AdminDashboard";
import { db } from "@/db/db";
import { user as userTable, wardrobes, orders } from "@/db/schema";
import { count, eq, gte, lte, and, sql } from "drizzle-orm";
import { queryPostHog } from "@/lib/posthog-query";
import {
  parseDateRangeParams,
  computePreviousPeriod,
} from "@/lib/date-range-utils";
import { format } from "date-fns";

interface AdminPageProps {
  searchParams?:
    | Promise<{
        from?: string | string[];
        to?: string | string[];
        preset?: string | string[];
      }>
    | {
        from?: string | string[];
        to?: string | string[];
        preset?: string | string[];
      };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  // --- Parse date range from URL ---
  const resolvedParams = (await searchParams) ?? {};
  const fromParam = Array.isArray(resolvedParams.from)
    ? resolvedParams.from[0]
    : resolvedParams.from;
  const toParam = Array.isArray(resolvedParams.to)
    ? resolvedParams.to[0]
    : resolvedParams.to;
  const presetParam = Array.isArray(resolvedParams.preset)
    ? resolvedParams.preset[0]
    : resolvedParams.preset;

  const { range, presetKey } = parseDateRangeParams({
    from: fromParam,
    to: toParam,
    preset: presetParam,
  });
  const prevRange = computePreviousPeriod(range);

  // Format for PostHog HogQL
  const phFrom = format(range.from, "yyyy-MM-dd HH:mm:ss");
  const phTo = format(range.to, "yyyy-MM-dd HH:mm:ss");
  const phPrevFrom = format(prevRange.from, "yyyy-MM-dd HH:mm:ss");
  const phPrevTo = format(prevRange.to, "yyyy-MM-dd HH:mm:ss");

  const [
    totalUsersResult,
    totalWardrobesResult,
    adminCountResult,
    dailyOrders,
    dailyRevenue,
    prevOrdersResult,
    prevRevenueResult,
    usersWithOrdersResult,
    dailySessionsRaw,
    prevSessionsRaw,
  ] = await Promise.all([
    db.select({ count: count() }).from(userTable),
    db.select({ count: count() }).from(wardrobes),
    db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.role, "admin")),
    // Orders per day (selected range)
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: count(),
      })
      .from(orders)
      .where(
        and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)),
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),
    // Revenue per day (selected range)
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)`,
      })
      .from(orders)
      .where(
        and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)),
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),
    // Previous period: orders
    db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, prevRange.from),
          lte(orders.createdAt, prevRange.to),
        ),
      ),
    // Previous period: revenue
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, prevRange.from),
          lte(orders.createdAt, prevRange.to),
        ),
      ),
    // Users who have placed at least 1 order (all-time)
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${orders.userId})`,
      })
      .from(orders),
    // PostHog: daily unique sessions (selected range)
    queryPostHog<[string, number]>(
      `SELECT toDate(timestamp) as date, count(DISTINCT $session_id) as sessions
       FROM events
       WHERE timestamp >= toDateTime('${phFrom}')
         AND timestamp <= toDateTime('${phTo}')
       GROUP BY date ORDER BY date`,
    ),
    // PostHog: previous period sessions
    queryPostHog<[number]>(
      `SELECT count(DISTINCT $session_id)
       FROM events
       WHERE timestamp >= toDateTime('${phPrevFrom}')
         AND timestamp <= toDateTime('${phPrevTo}')`,
    ),
  ]);

  const totalUsers = totalUsersResult[0]?.count ?? 0;

  const currentOrders = dailyOrders.reduce((sum, d) => sum + d.count, 0);
  const currentRevenue = dailyRevenue.reduce(
    (sum, d) => sum + Number(d.revenue),
    0,
  );

  const currentSessions = dailySessionsRaw.reduce(
    (sum, [, count]) => sum + Number(count),
    0,
  );
  const prevSessions = Number(prevSessionsRaw[0]?.[0] ?? 0);
  const dailySessions = dailySessionsRaw.map(([, count]) => ({
    value: Number(count),
  }));

  const conversionRate =
    totalUsers > 0
      ? (Number(usersWithOrdersResult[0]?.count ?? 0) / totalUsers) * 100
      : 0;

  return (
    <AdminDashboard
      user={user}
      stats={{
        totalUsers,
        totalWardrobes: totalWardrobesResult[0]?.count ?? 0,
        adminCount: adminCountResult[0]?.count ?? 0,
      }}
      analytics={{
        sessions: {
          value: currentSessions,
          prevValue: prevSessions,
          data: dailySessions,
        },
        revenue: {
          value: currentRevenue,
          prevValue: Number(prevRevenueResult[0]?.revenue ?? 0),
          data: dailyRevenue.map((d) => ({ value: Number(d.revenue) })),
        },
        orders: {
          value: currentOrders,
          prevValue: prevOrdersResult[0]?.count ?? 0,
          data: dailyOrders.map((d) => ({ value: d.count })),
        },
        conversionRate: {
          value: conversionRate,
        },
      }}
      dateRange={{
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        presetKey,
      }}
    />
  );
}
