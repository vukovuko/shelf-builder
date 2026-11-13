import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminAccessoryRulesQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

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
    cachedUnlessChanged(context.queryClient, adminAccessoryRulesQuery(deps)),
  component: AccessoryRulesPage,
});

function AccessoryRulesPage() {
  const { data } = useSuspenseQuery(
    adminAccessoryRulesQuery(Route.useSearch()),
  );
  return RulesClient && <RulesClient {...data} />;
}
