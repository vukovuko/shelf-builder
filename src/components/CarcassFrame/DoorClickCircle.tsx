"use client";

import { Html } from "@react-three/drei";
import { useState } from "react";
import { useShelfStore } from "@/lib/store";
import { Plus, X } from "lucide-react";
import {
  MIN_DOOR_HEIGHT_CM,
  MAX_DOOR_HEIGHT_CM,
} from "@/lib/wardrobe-constants";

interface DoorClickCircleProps {
  compartmentKey: string;
  position: [number, number, number];
  heightCm: number;
  columnIndex: number;
}

export function DoorClickCircle({
  compartmentKey,
  position,
  heightCm,
}: DoorClickCircleProps) {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const selectedDoorCompartments = useShelfStore(
    (s) => s.selectedDoorCompartments,
  );
  const doorSelectionDragging = useShelfStore((s) => s.doorSelectionDragging);
  const startDoorSelection = useShelfStore((s) => s.startDoorSelection);
  const updateDoorSelectionDrag = useShelfStore(
    (s) => s.updateDoorSelectionDrag,
  );
  const endDoorSelection = useShelfStore((s) => s.endDoorSelection);

  const isSelected = selectedDoorCompartments.includes(compartmentKey);

  // Check if height is within door constraints
  const canHaveDoor =
    heightCm >= MIN_DOOR_HEIGHT_CM && heightCm <= MAX_DOOR_HEIGHT_CM;

  // Show hover state if button is hovered OR if in range during drag
  const showHover = isButtonHovered || isSelected;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!canHaveDoor) return;
    startDoorSelection(compartmentKey);
  };

  const handlePointerEnter = () => {
    setIsButtonHovered(true);
    if (doorSelectionDragging && canHaveDoor) {
      updateDoorSelectionDrag(compartmentKey);
    }
  };

  const handlePointerLeave = () => {
    setIsButtonHovered(false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (doorSelectionDragging) {
      endDoorSelection();
    }
  };

  return (
    <Html position={position} center zIndexRange={[1, 10]}>
      <button
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        disabled={!canHaveDoor}
        title={
          !canHaveDoor
            ? `Visina: ${heightCm}cm (dozvoljeno: ${MIN_DOOR_HEIGHT_CM}-${MAX_DOOR_HEIGHT_CM}cm)`
            : undefined
        }
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: !canHaveDoor
            ? "2px solid #45475a"
            : isSelected
              ? "3px solid #cba6f7"
              : showHover
                ? "2px solid #89b4fa"
                : "2px solid #585b70",
          background: !canHaveDoor
            ? "#1e1e2e"
            : isSelected
              ? "#cba6f7"
              : showHover
                ? "#45475a"
                : "#313244",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: canHaveDoor ? "pointer" : "not-allowed",
          transition: "all 0.15s ease",
          boxShadow:
            showHover || isSelected
              ? "0 3px 12px rgba(0,0,0,0.4)"
              : "0 2px 8px rgba(0,0,0,0.3)",
          opacity: canHaveDoor ? 1 : 0.5,
        }}
      >
        {!canHaveDoor ? (
          <X size={22} color="#f38ba8" />
        ) : (
          <Plus
            size={22}
            color={isSelected ? "#1e1e2e" : showHover ? "#89b4fa" : "#cdd6f4"}
          />
        )}
      </button>
    </Html>
  );
}
