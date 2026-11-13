import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminModelsQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

const ModelsClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/models/ModelsClient").then((module) => ({
        default: module.ModelsClient,
      })),
    );

export const Route = createFileRoute("/admin/models/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    cachedUnlessChanged(context.queryClient, adminModelsQuery(deps)),
  component: ModelsPage,
});

function ModelsPage() {
  const { data } = useSuspenseQuery(adminModelsQuery(Route.useSearch()));
  return ModelsClient && <ModelsClient {...data} />;
}
