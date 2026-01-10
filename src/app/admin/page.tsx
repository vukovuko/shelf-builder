import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/roles";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Not logged in
  if (!user) {
    redirect("/");
  }

  // Not admin
  if (!isAdmin(user.role)) {
    redirect("/");
  }

  return <AdminDashboard user={user} />;
}
