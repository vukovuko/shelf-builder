"use client";

import { Html } from "@react-three/drei";
import { useState } from "react";
import { useShelfStore } from "@/lib/store";
import { Plus } from "lucide-react";

interface CompartmentClickCircleProps {
  compartmentKey: string;
  position: [number, number, number];
}

export function CompartmentClickCircle({
  compartmentKey,
  position,
}: CompartmentClickCircleProps) {
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const selectedKey = useShelfStore((s) => s.selectedCompartmentKey);
  const setSelectedKey = useShelfStore((s) => s.setSelectedCompartmentKey);
  const hoveredCompKey = useShelfStore((s) => s.hoveredCompartmentKey);

  const isSelected = selectedKey === compartmentKey;
  const isCompartmentHovered = hoveredCompKey === compartmentKey;
  // Show hover state if button OR compartment area is hovered
  const showHover = isButtonHovered || isCompartmentHovered;

  return (
    <Html position={position} center zIndexRange={[1, 10]}>
      <button
        onClick={() => setSelectedKey(compartmentKey)}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: isSelected
            ? "3px solid #cba6f7"
            : showHover
              ? "2px solid #89b4fa"
              : "2px solid #585b70",
          background: isSelected
            ? "#cba6f7"
            : showHover
              ? "#45475a"
              : "#313244",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow:
            showHover || isSelected
              ? "0 3px 12px rgba(0,0,0,0.4)"
              : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <Plus
          size={22}
          color={isSelected ? "#1e1e2e" : showHover ? "#89b4fa" : "#cdd6f4"}
        />
      </button>
    </Html>
  );
}
