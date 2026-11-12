import { useSuspenseQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { myOrderQuery, sceneMaterialsQuery } from "@/server/account.functions";

// The page draws the ordered design in 3D, so it is loaded in the browser
// only and three.js stays out of the Worker (same as the configurator).
const OrderDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/account/OrderDetailClient").then((module) => ({
        default: module.OrderDetailClient,
      })),
    );

export const Route = createFileRoute("/account/orders/$id")({
  loader: async ({ context, params }) => {
    if (!context.user) return;
    // The materials are only for the 3D view and are not waited for.
    context.queryClient.prefetchQuery(sceneMaterialsQuery);
    const found = await context.queryClient.ensureQueryData(
      myOrderQuery(params.id),
    );
    if (!found) throw notFound();
  },
  component: OrderPage,
});

function OrderPage() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <OrderDetail />
      </Suspense>
    </ClientOnly>
  );
}

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: found } = useSuspenseQuery(myOrderQuery(id));
  const { data: materials } = useSuspenseQuery(sceneMaterialsQuery);
  if (!OrderDetailClient || !found || !materials) return null;

  return (
    <OrderDetailClient
      order={found.order}
      wardrobeData={found.wardrobeData}
      materials={materials}
    />
  );
}
