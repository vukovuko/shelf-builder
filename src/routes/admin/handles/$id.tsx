import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminHandleQuery } from "@/server/admin/admin.functions";

const HandleDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/handles/[id]/HandleDetailClient").then(
        (module) => ({
          default: module.HandleDetailClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/handles/$id")({
  loader: async ({ context, params }) => {
    const id = Number.parseInt(params.id, 10);
    if (!(id > 0)) throw notFound();
    const found = await context.queryClient.fetchQuery(adminHandleQuery(id));
    if (!found) throw notFound();
    return found;
  },
  component: HandlePage,
});

function HandlePage() {
  const data = Route.useLoaderData();
  return HandleDetailClient && <HandleDetailClient handle={data} />;
}
