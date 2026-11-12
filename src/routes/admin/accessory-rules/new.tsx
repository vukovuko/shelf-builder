import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const AccessoryRuleFormClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/accessory-rules/AccessoryRuleFormClient").then(
        (module) => ({
          default: module.AccessoryRuleFormClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/accessory-rules/new")({
  component: NewAccessoryRulePage,
});

function NewAccessoryRulePage() {
  return AccessoryRuleFormClient && <AccessoryRuleFormClient mode="create" />;
}
