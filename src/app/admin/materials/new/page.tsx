import { requireAdminPage } from "@/lib/roles";
import { MaterialNewClient } from "./MaterialNewClient";

export default async function NewMaterialPage() {
  await requireAdminPage();
  return <MaterialNewClient />;
}
