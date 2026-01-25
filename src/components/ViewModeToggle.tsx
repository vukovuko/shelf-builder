"use client";

import { ChevronDown, Rotate3d, Ruler, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShelfStore, type ViewMode, type ShelfState } from "@/lib/store";

export function ViewModeToggle() {
  const viewMode = useShelfStore((s: ShelfState) => s.viewMode);
  const setViewMode = useShelfStore((s: ShelfState) => s.setViewMode);

  const viewModeConfig: Record<
    ViewMode,
    { icon: typeof Rotate3d; label: string }
  > = {
    "3D": {
      icon: Rotate3d,
      label: "3D Prikaz",
    },
    "2D": {
      icon: Square,
      label: "2D Prikaz",
    },
    Sizing: {
      icon: Ruler,
      label: "Kotiranje",
    },
  };

  const currentConfig = viewModeConfig[viewMode];
  const CurrentIcon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentConfig.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {Object.entries(viewModeConfig).map(([mode, config]) => {
          const Icon = config.icon;
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => setViewMode(mode as ViewMode)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
