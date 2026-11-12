import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminRuleQuery } from "@/server/admin/admin.functions";

const RuleFormClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/rules/RuleFormClient").then((module) => ({
        default: module.RuleFormClient,
      })),
    );

export const Route = createFileRoute("/admin/rules/$id")({
  loader: async ({ context, params }) => {
    const found = await context.queryClient.fetchQuery(
      adminRuleQuery(params.id),
    );
    if (!found) throw notFound();
    return found;
  },
  component: RulePage,
});

function RulePage() {
  const data = Route.useLoaderData();
  return RuleFormClient && <RuleFormClient mode="edit" initialRule={data} />;
}
