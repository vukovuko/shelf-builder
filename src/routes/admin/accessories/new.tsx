import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const AccessoryNewClient = import.meta.env.SSR
  ? null
  : lazy(() => import("@/components/admin/accessories/new/AccessoryNewClient"));

export const Route = createFileRoute("/admin/accessories/new")({
  component: NewAccessoryPage,
});

function NewAccessoryPage() {
  return AccessoryNewClient && <AccessoryNewClient />;
}
