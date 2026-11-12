import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminAccessoryRuleQuery } from "@/server/admin/admin.functions";

const AccessoryRuleFormClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/accessory-rules/AccessoryRuleFormClient").then(
        (module) => ({
          default: module.AccessoryRuleFormClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/accessory-rules/$id")({
  loader: async ({ context, params }) => {
    const found = await context.queryClient.fetchQuery(
      adminAccessoryRuleQuery(params.id),
    );
    if (!found) throw notFound();
    return found;
  },
  component: AccessoryRulePage,
});

function AccessoryRulePage() {
  const data = Route.useLoaderData();
  return (
    AccessoryRuleFormClient && (
      <AccessoryRuleFormClient mode="edit" initialRule={data} />
    )
  );
}
