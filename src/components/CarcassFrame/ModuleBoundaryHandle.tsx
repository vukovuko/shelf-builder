"use client";

import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { useShelfStore } from "@/lib/store";
import { GripHorizontal } from "lucide-react";

// Throttle interval in ms (~20 updates/sec during drag)
const THROTTLE_MS = 50;

interface ModuleBoundaryHandleProps {
  columnIndex: number;
  x: number;
  y: number; // Current boundary Y position
  depth: number;
  colWidth: number;
  minY: number; // Minimum Y (MIN_TOP_HEIGHT from bottom)
  maxY: number; // Maximum Y (colH - MIN_TOP_HEIGHT)
}

/**
 * ModuleBoundaryHandle - Drags the module boundary up/down (Y direction)
 * Uses relative dragging: captures start position and applies delta
 * Similar to HorizontalSplitHandle but for module boundaries (stacked modules)
 */
export function ModuleBoundaryHandle({
  columnIndex,
  x,
  y,
  depth,
  colWidth,
  minY,
  maxY,
}: ModuleBoundaryHandleProps) {
  const moveColumnModuleBoundary = useShelfStore(
    (state) => state.moveColumnModuleBoundary,
  );
  const setIsDragging = useShelfStore((state) => state.setIsDragging);
  const setHoveredColumnIndex = useShelfStore(
    (state) => state.setHoveredColumnIndex,
  );
  const { camera, gl } = useThree();

  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const isDraggingRef = useRef(false);
  const currentDragYRef = useRef(y);
  const lastStoreUpdateRef = useRef(0);

  // Stable refs for functions (prevents useEffect re-subscription)
  const moveColumnModuleBoundaryRef = useRef(moveColumnModuleBoundary);
  const setIsDraggingRef = useRef(setIsDragging);
  useEffect(() => {
    moveColumnModuleBoundaryRef.current = moveColumnModuleBoundary;
    setIsDraggingRef.current = setIsDragging;
  });

  // For relative dragging
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());
  const startY = useRef(0); // Initial boundary Y when drag started
  const startMouseY = useRef(0); // Initial mouse world Y when drag started

  const handlePointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      e.stopPropagation();
      isDraggingRef.current = true;
      setIsDraggingLocal(true);
      setIsDragging(true);
      gl.domElement.style.cursor = "grabbing";

      // Store the starting boundary Y
      startY.current = y;

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
    [gl, setIsDragging, y, depth, camera],
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
        // Apply delta to starting boundary Y
        const newY = Math.max(minY, Math.min(maxY, startY.current + deltaY));
        currentDragYRef.current = newY;

        // Throttled store update (~20 updates/sec instead of 60-120)
        const now = Date.now();
        if (now - lastStoreUpdateRef.current >= THROTTLE_MS) {
          lastStoreUpdateRef.current = now;
          moveColumnModuleBoundaryRef.current(columnIndex, newY);
        }
      }
    };

    const handleGlobalUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingLocal(false);
        // Final store update to ensure exact position is committed
        moveColumnModuleBoundaryRef.current(
          columnIndex,
          currentDragYRef.current,
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
  }, [camera, gl, minY, maxY, columnIndex]);

  return (
    <group position={[x, y, depth / 2 + 0.01]}>
      {/* Invisible hit area for easier clicking */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          setIsHovered(true);
          setHoveredColumnIndex(columnIndex);
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
        <planeGeometry args={[colWidth * 0.5, 0.1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible handle with HTML - distinct style for module boundary */}
      <Html center zIndexRange={[1, 10]}>
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e.nativeEvent);
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: isDraggingLocal ? "#fff3e0" : "#ffffff",
            border: `3px solid ${isHovered || isDraggingLocal ? "#ff6600" : "#cc5500"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isDraggingLocal ? "grabbing" : "grab",
            userSelect: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={() => {
            setIsHovered(true);
            setHoveredColumnIndex(columnIndex);
          }}
          onMouseLeave={() => !isDraggingRef.current && setIsHovered(false)}
        >
          <GripHorizontal
            size={20}
            strokeWidth={3}
            color={isHovered || isDraggingLocal ? "#ff6600" : "#cc5500"}
          />
        </div>
      </Html>
    </group>
  );
}
