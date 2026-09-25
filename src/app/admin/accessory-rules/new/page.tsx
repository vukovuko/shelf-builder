import { requireAdminPage } from "@/lib/roles";
import { AccessoryRuleFormClient } from "../AccessoryRuleFormClient";

export default async function NewAccessoryRulePage() {
  await requireAdminPage();
  return <AccessoryRuleFormClient mode="create" />;
}
