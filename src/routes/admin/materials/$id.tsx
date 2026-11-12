import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminMaterialQuery } from "@/server/admin/admin.functions";

const MaterialDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/materials/[id]/MaterialDetailClient").then(
        (module) => ({
          default: module.MaterialDetailClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/materials/$id")({
  loader: async ({ context, params }) => {
    const id = Number.parseInt(params.id, 10);
    if (!(id > 0)) throw notFound();
    const found = await context.queryClient.fetchQuery(adminMaterialQuery(id));
    if (!found) throw notFound();
    return found;
  },
  component: MaterialPage,
});

function MaterialPage() {
  const data = Route.useLoaderData();
  return MaterialDetailClient && <MaterialDetailClient material={data} />;
}
