import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminOrderQuery } from "@/server/admin/admin.functions";

const OrderDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/orders/[id]/OrderDetailClient").then(
        (module) => ({
          default: module.OrderDetailClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/orders/$id")({
  loader: async ({ context, params }) => {
    const found = await context.queryClient.fetchQuery(
      adminOrderQuery(params.id),
    );
    if (!found) throw notFound();
    return found;
  },
  component: OrderPage,
});

function OrderPage() {
  const data = Route.useLoaderData();
  return OrderDetailClient && <OrderDetailClient {...data} />;
}
