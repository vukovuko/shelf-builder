"use client";

import { Html } from "@react-three/drei";
import { useState } from "react";
import { useShelfStore, type ShelfState, type DoorGroup } from "@/lib/store";
import { Plus, X, DoorOpen } from "lucide-react";
import {
  MIN_DOOR_HEIGHT_CM,
  MAX_DOOR_HEIGHT_CM,
} from "@/lib/wardrobe-constants";

interface DoorClickCircleProps {
  compartmentKey: string;
  position: [number, number, number];
  heightCm: number;
  columnIndex: number;
  hasExternalDrawers?: boolean;
}

export function DoorClickCircle({
  compartmentKey,
  position,
  heightCm,
  hasExternalDrawers = false,
}: DoorClickCircleProps) {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const selectedDoorCompartments = useShelfStore(
    (s: ShelfState) => s.selectedDoorCompartments,
  );
  const doorSelectionDragging = useShelfStore(
    (s: ShelfState) => s.doorSelectionDragging,
  );
  const startDoorSelection = useShelfStore(
    (s: ShelfState) => s.startDoorSelection,
  );
  const updateDoorSelectionDrag = useShelfStore(
    (s: ShelfState) => s.updateDoorSelectionDrag,
  );
  const endDoorSelection = useShelfStore((s: ShelfState) => s.endDoorSelection);
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);

  const isSelected = selectedDoorCompartments.includes(compartmentKey);

  // Check if compartment is part of an existing door group
  const existingGroup = doorGroups.find((g: DoorGroup) =>
    g.compartments.includes(compartmentKey),
  );
  const isPartOfGroup = !!existingGroup;

  // Check if height is within door constraints
  const canHaveDoor =
    heightCm >= MIN_DOOR_HEIGHT_CM && heightCm <= MAX_DOOR_HEIGHT_CM;

  // Too small = can combine with others to reach minimum
  const isTooSmall = heightCm < MIN_DOOR_HEIGHT_CM;

  // Too tall = can NEVER have a door (even combining won't help)
  const isTooTall = heightCm > MAX_DOOR_HEIGHT_CM;

  // External drawers replace doors - can't have both
  const isBlockedByDrawer = hasExternalDrawers;

  // Show hover state if button is hovered OR if in range during drag
  const showHover = isButtonHovered || isSelected;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    // Block if TOO TALL or has EXTERNAL DRAWERS (both can never have door)
    // Small compartments CAN be combined, so allow selection
    if (isTooTall || isBlockedByDrawer) return;
    startDoorSelection(compartmentKey);
  };

  const handlePointerEnter = () => {
    setIsButtonHovered(true);
    // Allow dragging over small compartments too (they can be combined)
    // Block if too tall or has external drawers
    if (doorSelectionDragging && !isTooTall && !isBlockedByDrawer) {
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

  // Determine icon and colors based on state
  const getIcon = () => {
    if (isTooTall || isBlockedByDrawer) {
      // Red X - can never have door (too tall or external drawers)
      return <X size={22} color="#f38ba8" />;
    }
    if (isPartOfGroup) {
      // Show door icon for compartments that are part of a group
      return (
        <DoorOpen
          size={20}
          color={isSelected ? "#1e1e2e" : showHover ? "#89b4fa" : "#a6e3a1"}
        />
      );
    }
    // Plus icon - orange for small (can combine), white for normal
    return (
      <Plus
        size={22}
        color={
          isSelected
            ? "#1e1e2e"
            : showHover
              ? "#89b4fa"
              : isTooSmall
                ? "#fab387" // Orange hint for small compartments
                : "#cdd6f4"
        }
      />
    );
  };

  // Border color - green tint for existing groups, orange for small
  const getBorderColor = () => {
    if (isTooTall || isBlockedByDrawer) return "2px solid #45475a";
    if (isSelected) return "3px solid #cba6f7";
    if (isPartOfGroup) {
      return showHover ? "2px solid #89b4fa" : "2px solid #a6e3a1";
    }
    if (isTooSmall) {
      return showHover ? "2px solid #89b4fa" : "2px solid #fab387"; // Orange border
    }
    return showHover ? "2px solid #89b4fa" : "2px solid #585b70";
  };

  // Background color - green tint for existing groups
  const getBackgroundColor = () => {
    if (isTooTall || isBlockedByDrawer) return "#1e1e2e";
    if (isSelected) return "#cba6f7";
    if (isPartOfGroup) {
      return showHover ? "#45475a" : "#2d4434"; // Dark green background
    }
    return showHover ? "#45475a" : "#313244";
  };

  return (
    <Html position={position} center zIndexRange={[1, 10]}>
      <button
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        disabled={isTooTall || isBlockedByDrawer}
        title={
          isBlockedByDrawer
            ? "Spoljašnja fioka zamenjuje vrata"
            : isTooTall
              ? `Previsoko: ${heightCm}cm (max ${MAX_DOOR_HEIGHT_CM}cm)`
              : isTooSmall
                ? `${heightCm}cm - izaberite više pregrada za kombinovanje`
                : isPartOfGroup
                  ? `Deo vrata: ${existingGroup.compartments.join(" + ")} (${existingGroup.type})`
                  : undefined
        }
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: getBorderColor(),
          background: getBackgroundColor(),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isTooTall || isBlockedByDrawer ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          boxShadow:
            showHover || isSelected
              ? "0 3px 12px rgba(0,0,0,0.4)"
              : "0 2px 8px rgba(0,0,0,0.3)",
          opacity: isTooTall || isBlockedByDrawer ? 0.5 : 1,
        }}
      >
        {getIcon()}
      </button>
    </Html>
  );
}
