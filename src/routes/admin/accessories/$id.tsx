import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminAccessoryQuery } from "@/server/admin/admin.functions";

const AccessoryDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/accessories/[id]/AccessoryDetailClient").then(
        (module) => ({
          default: module.AccessoryDetailClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/accessories/$id")({
  loader: async ({ context, params }) => {
    const id = Number.parseInt(params.id, 10);
    if (!(id > 0)) throw notFound();
    const found = await context.queryClient.fetchQuery(adminAccessoryQuery(id));
    if (!found) throw notFound();
    return found;
  },
  component: AccessoryPage,
});

function AccessoryPage() {
  const data = Route.useLoaderData();
  return AccessoryDetailClient && <AccessoryDetailClient accessory={data} />;
}
