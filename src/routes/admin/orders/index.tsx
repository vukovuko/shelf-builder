import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminOrdersQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

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
    cachedUnlessChanged(context.queryClient, adminOrdersQuery(deps)),
  component: OrdersPage,
});

function OrdersPage() {
  const { data } = useSuspenseQuery(adminOrdersQuery(Route.useSearch()));
  return OrdersClient && <OrdersClient {...data} />;
}
