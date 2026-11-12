import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { OrdersClient } from "@/components/account/OrdersClient";
import { myOrdersQuery } from "@/server/account.functions";

export const Route = createFileRoute("/account/orders/")({
  loader: ({ context }) =>
    context.user ? context.queryClient.ensureQueryData(myOrdersQuery) : null,
  component: OrdersPage,
});

function OrdersPage() {
  const { data: orders } = useSuspenseQuery(myOrdersQuery);
  return orders && <OrdersClient orders={orders} />;
}
