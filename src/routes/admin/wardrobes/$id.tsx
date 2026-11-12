import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminWardrobeQuery } from "@/server/admin/admin.functions";

const WardrobePreviewClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/wardrobes/[id]/WardrobePreviewClient").then(
        (module) => ({
          default: module.WardrobePreviewClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/wardrobes/$id")({
  loader: async ({ context, params }) => {
    const found = await context.queryClient.fetchQuery(
      adminWardrobeQuery(params.id),
    );
    if (!found) throw notFound();
    return found;
  },
  component: WardrobePage,
});

function WardrobePage() {
  const data = Route.useLoaderData();
  return WardrobePreviewClient && <WardrobePreviewClient {...data} />;
}
