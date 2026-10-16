"use client";

import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redoDesign, undoDesign, useDesignHistory } from "@/lib/design-history";

/**
 * Undo and redo, side by side. Both appear with the first change and then
 * stay put, greyed out when there is nothing to go back or forward to, so
 * neither button jumps around under the cursor.
 */
export function HistoryButtons() {
  const hasHistory = useDesignHistory((s) => s.hasHistory);
  const canUndo = useDesignHistory((s) => s.canUndo);
  const canRedo = useDesignHistory((s) => s.canRedo);
  if (!hasHistory) return null;
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={undoDesign}
        disabled={!canUndo}
        title="Poništi (Ctrl+Z / ⌘Z)"
        aria-label="Poništi poslednju izmenu"
      >
        <Undo2 className="h-4 w-4" stroke="#4c4f69" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={redoDesign}
        disabled={!canRedo}
        title="Vrati (Ctrl+Shift+Z / ⇧⌘Z)"
        aria-label="Vrati poništenu izmenu"
      >
        <Redo2 className="h-4 w-4" stroke="#4c4f69" />
      </Button>
    </div>
  );
}
