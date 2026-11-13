import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import {
  adminWardrobesQuery,
  cachedUnlessChanged,
} from "@/server/admin/admin.functions";

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
    cachedUnlessChanged(context.queryClient, adminWardrobesQuery(deps)),
  component: WardrobesPage,
});

function WardrobesPage() {
  const { data } = useSuspenseQuery(adminWardrobesQuery(Route.useSearch()));
  return WardrobesClient && <WardrobesClient {...data} />;
}
