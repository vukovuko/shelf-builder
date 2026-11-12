import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminSettingsQuery } from "@/server/admin/admin.functions";

const SettingsClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/settings/SettingsClient").then((module) => ({
        default: module.SettingsClient,
      })),
    );

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) => context.queryClient.fetchQuery(adminSettingsQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const data = Route.useLoaderData();
  return SettingsClient && <SettingsClient initialSettings={data} />;
}
