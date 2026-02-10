import { getCurrentUser } from "@/lib/roles";
import { AdminDashboard } from "./AdminDashboard";
import { db } from "@/db/db";
import { user as userTable, wardrobes, orders, session } from "@/db/schema";
import { count, eq, gte, lt, and, sql } from "drizzle-orm";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalUsersResult,
    totalWardrobesResult,
    adminCountResult,
    // Sparkline data (last 30 days, grouped by day)
    dailyOrders,
    dailyRevenue,
    dailySessions,
    // Previous period totals (30-60 days ago) for % change
    prevOrdersResult,
    prevRevenueResult,
    prevSessionsResult,
    // Conversion rate
    usersWithOrdersResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(userTable),
    db.select({ count: count() }).from(wardrobes),
    db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.role, "admin")),
    // Orders per day (last 30 days)
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: count(),
      })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),
    // Revenue per day (last 30 days)
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalPrice}), 0)`,
      })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),
    // Sessions per day (last 30 days)
    db
      .select({
        date: sql<string>`DATE(${session.createdAt})`,
        count: count(),
      })
      .from(session)
      .where(gte(session.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${session.createdAt})`)
      .orderBy(sql`DATE(${session.createdAt})`),
    // Previous period: orders
    db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, sixtyDaysAgo),
          lt(orders.createdAt, thirtyDaysAgo),
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
          gte(orders.createdAt, sixtyDaysAgo),
          lt(orders.createdAt, thirtyDaysAgo),
        ),
      ),
    // Previous period: sessions
    db
      .select({ count: count() })
      .from(session)
      .where(
        and(
          gte(session.createdAt, sixtyDaysAgo),
          lt(session.createdAt, thirtyDaysAgo),
        ),
      ),
    // Users who have placed at least 1 order
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${orders.userId})`,
      })
      .from(orders),
  ]);

  const totalUsers = totalUsersResult[0]?.count ?? 0;

  // Compute current period totals from sparkline data
  // Note: sql<number> is a TS hint only — PostgreSQL returns strings for SUM/COALESCE
  const currentOrders = dailyOrders.reduce((sum, d) => sum + d.count, 0);
  const currentRevenue = dailyRevenue.reduce(
    (sum, d) => sum + Number(d.revenue),
    0,
  );
  const currentSessions = dailySessions.reduce((sum, d) => sum + d.count, 0);

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
          prevValue: prevSessionsResult[0]?.count ?? 0,
          data: dailySessions.map((d) => ({ value: d.count })),
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
    />
  );
}
