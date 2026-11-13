import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminHandlesQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

const HandlesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/handles/HandlesClient").then((module) => ({
        default: module.HandlesClient,
      })),
    );

export const Route = createFileRoute("/admin/handles/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    cachedUnlessChanged(context.queryClient, adminHandlesQuery(deps)),
  component: HandlesPage,
});

function HandlesPage() {
  const { data } = useSuspenseQuery(adminHandlesQuery(Route.useSearch()));
  return HandlesClient && <HandlesClient {...data} />;
}
