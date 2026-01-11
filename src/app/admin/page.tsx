import { getCurrentUser } from "@/lib/roles";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  // Layout already checks admin access, but we need user for display
  const user = await getCurrentUser();

  return <AdminDashboard user={user!} />;
}
