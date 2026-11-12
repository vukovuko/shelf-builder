import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminRulesQuery } from "@/server/admin/admin.functions";

const RulesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/rules/RulesClient").then((module) => ({
        default: module.RulesClient,
      })),
    );

export const Route = createFileRoute("/admin/rules/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminRulesQuery(deps)),
  component: RulesPage,
});

function RulesPage() {
  const data = Route.useLoaderData();
  return RulesClient && <RulesClient {...data} />;
}
