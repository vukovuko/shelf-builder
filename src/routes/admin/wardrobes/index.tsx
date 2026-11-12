import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminWardrobesQuery } from "@/server/admin/admin.functions";

const WardrobesClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/wardrobes/WardrobesClient").then((module) => ({
        default: module.WardrobesClient,
      })),
    );

export const Route = createFileRoute("/admin/wardrobes/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminWardrobesQuery(deps)),
  component: WardrobesPage,
});

function WardrobesPage() {
  const data = Route.useLoaderData();
  return WardrobesClient && <WardrobesClient {...data} />;
}
