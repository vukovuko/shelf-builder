import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminPriceSyncQuery } from "@/server/admin/admin.functions";

const PriceSyncClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/materials/cene/PriceSyncClient").then(
        (module) => ({
          default: module.PriceSyncClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/materials/cene")({
  loader: ({ context }) => context.queryClient.fetchQuery(adminPriceSyncQuery),
  component: PriceSyncPage,
});

function PriceSyncPage() {
  const data = Route.useLoaderData();
  return PriceSyncClient && <PriceSyncClient {...data} />;
}
