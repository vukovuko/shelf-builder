import { format } from "date-fns";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, user as userTable, wardrobes } from "@/db/schema";
import {
  computePreviousPeriod,
  parseDateRangeParams,
} from "@/lib/date-range-utils";
import { queryPostHog } from "@/lib/posthog-query";
import { requireAdmin } from "@/lib/roles";

export interface DashboardRange {
  from?: string;
  to?: string;
  preset?: string;
}

const HOGQL_TIME = "yyyy-MM-dd HH:mm:ss";

/** Sales and visits for a date range, each next to the period before it. */
export async function loadDashboard(input: DashboardRange) {
  const admin = await requireAdmin();

  const { range, presetKey } = parseDateRangeParams(input);
  const previous = computePreviousPeriod(range);
  const inRange = and(
    gte(orders.createdAt, range.from),
    lte(orders.createdAt, range.to),
  );
  const inPrevious = and(
    gte(orders.createdAt, previous.from),
    lte(orders.createdAt, previous.to),
  );
  const day = sql<string>`DATE(${orders.createdAt})`;

  const [
    [users],
    [designs],
    [admins],
    dailyOrders,
    dailyRevenue,
    [previousOrders],
    [previousRevenue],
    [buyers],
    dailySessions,
    previousSessions,
  ] = await Promise.all([
    db.select({ count: count() }).from(userTable),
    db.select({ count: count() }).from(wardrobes),
    db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.role, "admin")),
    db
      .select({ date: day, count: count() })
      .from(orders)
      .where(inRange)
      .groupBy(day)
      .orderBy(day),
    db
      .select({
        date: day,
        revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)`,
      })
      .from(orders)
      .where(inRange)
      .groupBy(day)
      .orderBy(day),
    db.select({ count: count() }).from(orders).where(inPrevious),
    db
      .select({ revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)` })
      .from(orders)
      .where(inPrevious),
    // Customers with at least one order, all time.
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${orders.userId})` })
      .from(orders),
    queryPostHog<[string, number]>(
      `SELECT toDate(timestamp) as date, count(DISTINCT $session_id) as sessions
       FROM events
       WHERE timestamp >= toDateTime('${format(range.from, HOGQL_TIME)}')
         AND timestamp <= toDateTime('${format(range.to, HOGQL_TIME)}')
       GROUP BY date ORDER BY date`,
    ),
    queryPostHog<[number]>(
      `SELECT count(DISTINCT $session_id)
       FROM events
       WHERE timestamp >= toDateTime('${format(previous.from, HOGQL_TIME)}')
         AND timestamp <= toDateTime('${format(previous.to, HOGQL_TIME)}')`,
    ),
  ]);

  const totalUsers = users?.count ?? 0;

  return {
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
    stats: {
      totalUsers,
      totalWardrobes: designs?.count ?? 0,
      adminCount: admins?.count ?? 0,
    },
    analytics: {
      sessions: {
        value: dailySessions.reduce((sum, [, n]) => sum + Number(n), 0),
        prevValue: Number(previousSessions[0]?.[0] ?? 0),
        data: dailySessions.map(([, n]) => ({ value: Number(n) })),
      },
      revenue: {
        value: dailyRevenue.reduce((sum, d) => sum + Number(d.revenue), 0),
        prevValue: Number(previousRevenue?.revenue ?? 0),
        data: dailyRevenue.map((d) => ({ value: Number(d.revenue) })),
      },
      orders: {
        value: dailyOrders.reduce((sum, d) => sum + d.count, 0),
        prevValue: previousOrders?.count ?? 0,
        data: dailyOrders.map((d) => ({ value: d.count })),
      },
      conversionRate: {
        value:
          totalUsers > 0 ? (Number(buyers?.count ?? 0) / totalUsers) * 100 : 0,
      },
    },
    dateRange: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      presetKey,
    },
  };
}
