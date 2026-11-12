import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminMaterialsQuery } from "@/server/admin/admin.functions";

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
    context.queryClient.fetchQuery(adminMaterialsQuery(deps)),
  component: MaterialsPage,
});

function MaterialsPage() {
  const data = Route.useLoaderData();
  return MaterialsClient && <MaterialsClient {...data} />;
}
