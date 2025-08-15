"use client";

import { useShelfStore, ViewMode } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Rotate3d, Square, Ruler } from "lucide-react";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useShelfStore();

  const viewModeConfig = {
    "3D": {
      icon: Rotate3d,
      label: "3D View",
    },
    "2D": {
      icon: Square,
      label: "2D View",
    },
    Sizing: {
      icon: Ruler,
      label: "Sizing",
    },
  };

  const currentConfig = viewModeConfig[viewMode];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="absolute top-4 right-4 z-10">
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
    </div>
  );
}
