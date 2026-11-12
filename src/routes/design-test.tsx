import { createFileRoute } from "@tanstack/react-router";
import { DesignerShell } from "@/components/designer/DesignerShell";
import { NOINDEX } from "@/lib/seo/site";
import { designerDataQuery } from "@/server/designer.functions";

// The full configurator the team works on; /design is the public, reduced one.
export const Route = createFileRoute("/design-test")({
  loader: ({ context }) => {
    // Not awaited: the page shell is sent at once and the catalogs follow.
    context.queryClient.prefetchQuery(designerDataQuery);
  },
  head: () => ({
    meta: [{ title: "Konfigurator (test)" }, ...NOINDEX],
  }),
  component: () => <DesignerShell mode="full" />,
});
