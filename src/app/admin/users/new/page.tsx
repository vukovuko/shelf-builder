import { requireAdminPage } from "@/lib/roles";
import { UserNewClient } from "./UserNewClient";

export default async function NewUserPage() {
  await requireAdminPage();
  return <UserNewClient />;
}
