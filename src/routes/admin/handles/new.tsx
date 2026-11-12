import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const HandleNewClient = import.meta.env.SSR
  ? null
  : lazy(() => import("@/components/admin/handles/new/HandleNewClient"));

export const Route = createFileRoute("/admin/handles/new")({
  component: NewHandlePage,
});

function NewHandlePage() {
  return HandleNewClient && <HandleNewClient />;
}
