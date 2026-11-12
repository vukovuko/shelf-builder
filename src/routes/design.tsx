import { createFileRoute } from "@tanstack/react-router";
import { DesignerShell } from "@/components/designer/DesignerShell";
import { pageMeta } from "@/lib/seo/site";
import { designerDataQuery } from "@/server/designer.functions";

// The public configurator: dimensions and columns; the other steps are locked.
export const Route = createFileRoute("/design")({
  loader: ({ context }) => {
    // Not awaited: the page shell is sent at once and the catalogs follow.
    context.queryClient.prefetchQuery(designerDataQuery);
  },
  head: () => ({
    meta: pageMeta({
      title: "3D Konfigurator Ormana | Dizajnirajte Ormar po Meri Online",
      description:
        "Besplatan 3D konfigurator za ormare po meri. Birajte dimenzije, materijale, police, fioke i vrata. Vizualizujte orman uživo i preuzmite PDF specifikaciju.",
    }),
  }),
  component: () => <DesignerShell mode="basic" />,
});
