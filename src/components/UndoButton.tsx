"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { undoDesign, useDesignHistory } from "@/lib/design-history";

export function UndoButton() {
  const canUndo = useDesignHistory((s) => s.canUndo);
  if (!canUndo) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={undoDesign}
      title="Poništi (Ctrl+Z / ⌘Z)"
      aria-label="Poništi poslednju izmenu"
    >
      <Undo2 className="h-4 w-4" stroke="#4c4f69" />
    </Button>
  );
}
