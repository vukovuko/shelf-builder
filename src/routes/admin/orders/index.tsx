import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminOrdersQuery } from "@/server/admin/admin.functions";

const OrdersClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/orders/OrdersClient").then((module) => ({
        default: module.OrdersClient,
      })),
    );

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminOrdersQuery(deps)),
  component: OrdersPage,
});

function OrdersPage() {
  const data = Route.useLoaderData();
  return OrdersClient && <OrdersClient {...data} />;
}
