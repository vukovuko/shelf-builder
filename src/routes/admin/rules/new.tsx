import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const RuleFormClient = import.meta.env.SSR
  ? null
  : lazy(() =>
      import("@/components/admin/rules/RuleFormClient").then((module) => ({
        default: module.RuleFormClient,
      })),
    );

export const Route = createFileRoute("/admin/rules/new")({
  component: NewRulePage,
});

function NewRulePage() {
  return RuleFormClient && <RuleFormClient mode="create" />;
}
