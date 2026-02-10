import { getCurrentUser } from "@/lib/roles";
import { AdminDashboard } from "./AdminDashboard";
import { db } from "@/db/db";
import { user as userTable, wardrobes } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export default async function AdminPage() {
  // Layout already checks admin access, but we need user for display
  const user = await getCurrentUser();
  if (!user) return null;

  const [totalUsersResult, totalWardrobesResult, adminCountResult] =
    await Promise.all([
      db.select({ count: count() }).from(userTable),
      db.select({ count: count() }).from(wardrobes),
      db
        .select({ count: count() })
        .from(userTable)
        .where(eq(userTable.role, "admin")),
    ]);

  return (
    <AdminDashboard
      user={user}
      stats={{
        totalUsers: totalUsersResult[0]?.count ?? 0,
        totalWardrobes: totalWardrobesResult[0]?.count ?? 0,
        adminCount: adminCountResult[0]?.count ?? 0,
      }}
    />
  );
}
