import { useSuspenseQuery } from "@tanstack/react-query";
import type { DesignerMode } from "@/lib/designer-mode";
import { designerDataQuery } from "@/server/designer.functions";
import { DesignLayoutClient } from "./DesignLayoutClient";
import DesignPage from "./DesignPage";

/** The configurator with its catalogs; loaded in the browser only (see DesignerShell). */
export default function Designer({ mode }: { mode: DesignerMode }) {
  const { data } = useSuspenseQuery(designerDataQuery);
  return (
    <DesignLayoutClient
      initialSession={data.initialSession}
      initialMaterials={data.materials}
      initialHandles={data.handles}
      initialAccessories={data.accessories}
      initialAccessoryRules={data.accessoryRules}
      isAdmin={data.isAdmin}
      mode={mode}
    >
      <DesignPage />
    </DesignLayoutClient>
  );
}
