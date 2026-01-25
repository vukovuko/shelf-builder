"use client";

import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { useShelfStore } from "@/lib/store";
import { ChevronsUpDown } from "lucide-react";

// Throttle interval in ms (~20 updates/sec during drag)
const THROTTLE_MS = 50;

interface TopHeightHandleProps {
  columnIndex: number;
  x: number;
  y: number; // Current top Y position in meters
  depth: number;
  colWidth: number;
  minHeight: number; // Min column height in meters
  maxHeight: number; // Max column height in meters
  currentHeightM: number; // Current column height in meters
}

/**
 * TopHeightHandle - Drags up/down to change column height
 * Uses relative dragging: captures start position and applies delta
 */
export function TopHeightHandle({
  columnIndex,
  x,
  y,
  depth,
  colWidth,
  minHeight,
  maxHeight,
  currentHeightM,
}: TopHeightHandleProps) {
  const setColumnHeight = useShelfStore((state) => state.setColumnHeight);
  const setIsDragging = useShelfStore((state) => state.setIsDragging);
  const { camera, gl } = useThree();

  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const isDraggingRef = useRef(false);
  const currentDragHeightRef = useRef(currentHeightM);
  const lastStoreUpdateRef = useRef(0);

  // Stable refs for functions (prevents useEffect re-subscription)
  const setColumnHeightRef = useRef(setColumnHeight);
  const setIsDraggingRef = useRef(setIsDragging);
  useEffect(() => {
    setColumnHeightRef.current = setColumnHeight;
    setIsDraggingRef.current = setIsDragging;
  });

  // For relative dragging
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());
  const startHeightM = useRef(0); // Initial column height when drag started
  const startMouseY = useRef(0); // Initial mouse world Y when drag started

  const handlePointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      e.stopPropagation();
      isDraggingRef.current = true;
      setIsDraggingLocal(true);
      setIsDragging(true);
      gl.domElement.style.cursor = "grabbing";

      // Store the starting column height
      startHeightM.current = currentHeightM;

      // Set up drag plane at Z = depth/2
      dragPlane.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, depth / 2),
      );

      // Get initial mouse world Y from the click position
      const rect = gl.domElement.getBoundingClientRect();
      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;
      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(
        new THREE.Vector2(mouseX, mouseY),
        camera,
      );
      if (
        raycaster.current.ray.intersectPlane(
          dragPlane.current,
          intersection.current,
        )
      ) {
        startMouseY.current = intersection.current.y;
      }
    },
    [gl, setIsDragging, currentHeightM, depth, camera],
  );

  // Global event listeners for drag
  React.useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(
        new THREE.Vector2(mouseX, mouseY),
        camera,
      );
      if (
        raycaster.current.ray.intersectPlane(
          dragPlane.current,
          intersection.current,
        )
      ) {
        // Calculate delta from start mouse position
        const deltaY = intersection.current.y - startMouseY.current;
        // Apply delta to starting height
        const newHeightM = Math.max(
          minHeight,
          Math.min(maxHeight, startHeightM.current + deltaY),
        );
        currentDragHeightRef.current = newHeightM;

        // Throttled store update (~20 updates/sec instead of 60-120)
        const now = Date.now();
        if (now - lastStoreUpdateRef.current >= THROTTLE_MS) {
          lastStoreUpdateRef.current = now;
          // Convert to CM and update store
          setColumnHeightRef.current(columnIndex, newHeightM * 100);
        }
      }
    };

    const handleGlobalUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingLocal(false);
        // Final store update to ensure exact value is committed
        setColumnHeightRef.current(
          columnIndex,
          currentDragHeightRef.current * 100,
        );
        setIsDraggingRef.current(false);
        gl.domElement.style.cursor = "auto";
      }
    };

    window.addEventListener("pointermove", handleGlobalMove);
    window.addEventListener("pointerup", handleGlobalUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalMove);
      window.removeEventListener("pointerup", handleGlobalUp);
    };
  }, [camera, gl, minHeight, maxHeight, columnIndex]);
  // Removed setColumnHeight, setIsDragging from deps - using refs instead

  return (
    <group position={[x, y, depth / 2 + 0.01]}>
      {/* Invisible hit area for easier clicking */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          setIsHovered(true);
          if (!isDraggingRef.current) {
            gl.domElement.style.cursor = "grab";
          }
        }}
        onPointerOut={() => {
          setIsHovered(false);
          if (!isDraggingRef.current) {
            gl.domElement.style.cursor = "auto";
          }
        }}
      >
        <planeGeometry args={[colWidth * 0.5, 0.08]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible circular handle with HTML */}
      <Html center zIndexRange={[1, 10]}>
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e.nativeEvent);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: isDraggingLocal ? "#45475a" : "#313244",
            border: `2px solid ${isHovered || isDraggingLocal ? "#94e2d5" : "#6c7086"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isDraggingLocal ? "grabbing" : "grab",
            userSelect: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => !isDraggingRef.current && setIsHovered(false)}
        >
          <ChevronsUpDown
            size={18}
            strokeWidth={2.5}
            color={isHovered || isDraggingLocal ? "#94e2d5" : "#cdd6f4"}
          />
        </div>
      </Html>
    </group>
  );
}
