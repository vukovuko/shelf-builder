import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy } from "react";
import { adminUserQuery } from "@/server/admin/admin.functions";

const UserDetailClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/users/[id]/UserDetailClient").then(
        (module) => ({
          default: module.UserDetailClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/users/$id")({
  loader: async ({ context, params }) => {
    const found = await context.queryClient.fetchQuery(
      adminUserQuery(params.id),
    );
    if (!found) throw notFound();
    return found;
  },
  component: UserPage,
});

function UserPage() {
  const data = Route.useLoaderData();
  return UserDetailClient && <UserDetailClient user={data} />;
}
