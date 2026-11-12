import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const MaterialNewClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/materials/new/MaterialNewClient").then(
        (module) => ({
          default: module.MaterialNewClient,
        }),
      ),
    );

export const Route = createFileRoute("/admin/materials/new")({
  component: NewMaterialPage,
});

function NewMaterialPage() {
  return MaterialNewClient && <MaterialNewClient />;
}
