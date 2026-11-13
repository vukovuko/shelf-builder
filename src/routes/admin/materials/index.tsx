import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminMaterialsQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

const MaterialsClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/materials/MaterialsClient").then((module) => ({
        default: module.MaterialsClient,
      })),
    );

export const Route = createFileRoute("/admin/materials/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    cachedUnlessChanged(context.queryClient, adminMaterialsQuery(deps)),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { data } = useSuspenseQuery(adminMaterialsQuery(Route.useSearch()));
  return MaterialsClient && <MaterialsClient {...data} />;
}
