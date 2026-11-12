import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminListSearch } from "@/lib/admin-search";
import { adminUsersQuery } from "@/server/admin/admin.functions";

const UsersClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/users/UsersClient").then((module) => ({
        default: module.UsersClient,
      })),
    );

export const Route = createFileRoute("/admin/users/")({
  validateSearch: adminListSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminUsersQuery(deps)),
  component: UsersPage,
});

function UsersPage() {
  const data = Route.useLoaderData();
  return UsersClient && <UsersClient {...data} />;
}
