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
  const [isHovered, setIsHovered] = useState(false);
  const selectedKey = useShelfStore((s) => s.selectedCompartmentKey);
  const setSelectedKey = useShelfStore((s) => s.setSelectedCompartmentKey);
  const isSelected = selectedKey === compartmentKey;

  return (
    <Html position={position} center zIndexRange={[1, 10]}>
      <button
        onClick={() => setSelectedKey(compartmentKey)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: isSelected ? "3px solid #2563eb" : "2px solid #666",
          background: isSelected ? "#2563eb" : isHovered ? "#e5e7eb" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {isHovered || isSelected ? (
          <Plus size={22} color={isSelected ? "#fff" : "#374151"} />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
            {compartmentKey}
          </span>
        )}
      </button>
    </Html>
  );
}
