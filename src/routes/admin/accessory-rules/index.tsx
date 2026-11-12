import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminAccessoryRulesQuery } from "@/server/admin/admin.functions";

const RulesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/accessory-rules/RulesClient").then(
        (module) => ({
          default: module.RulesClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/accessory-rules/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminAccessoryRulesQuery(deps)),
  component: AccessoryRulesPage,
});

function AccessoryRulesPage() {
  const data = Route.useLoaderData();
  return RulesClient && <RulesClient {...data} />;
}
