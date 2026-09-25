import { requireAdminPage } from "@/lib/roles";
import { RuleFormClient } from "../RuleFormClient";

export default async function NewRulePage() {
  await requireAdminPage();
  return <RuleFormClient mode="create" />;
}
