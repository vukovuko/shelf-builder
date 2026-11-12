import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const UserNewClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/users/new/UserNewClient").then((module) => ({
        default: module.UserNewClient,
      })),
    );

export const Route = createFileRoute("/admin/users/new")({
  component: NewUserPage,
});

function NewUserPage() {
  return UserNewClient && <UserNewClient />;
}
