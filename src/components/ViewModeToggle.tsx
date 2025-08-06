"use client";

import { useShelfStore, CameraMode } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Rotate3d, Square } from "lucide-react";

export function ViewModeToggle() {
  const { cameraMode, setCameraMode } = useShelfStore();

  const handleToggle = () => {
    const newMode: CameraMode = cameraMode === "2D" ? "3D" : "2D";
    setCameraMode(newMode);
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button variant="secondary" onClick={handleToggle}>
        {cameraMode === "2D" ? (
          <>
            <Rotate3d className="mr-2 h-4 w-4" />
            3D View
          </>
        ) : (
          <>
            <Square className="mr-2 h-4 w-4" />
            2D View
          </>
        )}
      </Button>
    </div>
  );
}
