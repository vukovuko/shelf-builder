import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import {
  adminDashboardQuery,
  type DashboardSearch,
} from "@/server/admin/admin.functions";

const AdminDashboard = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/AdminDashboard").then((module) => ({
        default: module.AdminDashboard,
      })),
    );

const text = (value: unknown) =>
  value == null || value === "" ? undefined : String(value).slice(0, 40);

export const Route = createFileRoute("/admin/")({
  // The date range of the charts: `?from=…&to=…` or `?preset=…`.
  validateSearch: (raw: Record<string, unknown>): DashboardSearch => ({
    ...(text(raw.from) && { from: text(raw.from) }),
    ...(text(raw.to) && { to: text(raw.to) }),
    ...(text(raw.preset) && { preset: text(raw.preset) }),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.fetchQuery(adminDashboardQuery(deps)),
  component: DashboardPage,
});

function DashboardPage() {
  const data = Route.useLoaderData();
  return AdminDashboard && <AdminDashboard {...data} />;
}
