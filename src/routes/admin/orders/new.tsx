import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminNewOrderOptionsQuery } from "@/server/admin/admin.functions";

const OrderNewClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/orders/new/OrderNewClient").then((module) => ({
        default: module.OrderNewClient,
      })),
    );

export const Route = createFileRoute("/admin/orders/new")({
  loader: ({ context }) =>
    context.queryClient.fetchQuery(adminNewOrderOptionsQuery),
  component: NewOrderPage,
});

function NewOrderPage() {
  const data = Route.useLoaderData();
  return OrderNewClient && <OrderNewClient {...data} />;
}
