"use client";

import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useShelfStore } from "@/lib/store";

interface SeamHandleProps {
  seamIndex: number;
  x: number;
  height: number;
  depth: number;
  minX: number;
  maxX: number;
}

/**
 * SeamHandle - A visible circular handle for adjusting seam positions
 */
export function SeamHandle({
  seamIndex,
  x,
  height,
  depth,
  minX,
  maxX,
}: SeamHandleProps) {
  const setVerticalBoundary = useShelfStore(
    (state) => state.setVerticalBoundary,
  );
  const setIsDragging = useShelfStore((state) => state.setIsDragging);
  const { camera, gl } = useThree();

  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const isDraggingRef = useRef(false);

  // Drag plane for raycasting
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());

  const handlePointerDown = useCallback(
    (e: React.PointerEvent | THREE.Event) => {
      if ("stopPropagation" in e) e.stopPropagation();
      isDraggingRef.current = true;
      setIsDraggingLocal(true);
      setIsDragging(true);
      gl.domElement.style.cursor = "grabbing";

      // Set up drag plane
      dragPlane.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(x, 0, depth / 2),
      );
    },
    [gl, setIsDragging, x, depth],
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
        const newX = Math.max(minX, Math.min(maxX, intersection.current.x));
        setVerticalBoundary(seamIndex, newX);
      }
    };

    const handleGlobalUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingLocal(false);
        setIsDragging(false);
        gl.domElement.style.cursor = "auto";
      }
    };

    window.addEventListener("pointermove", handleGlobalMove);
    window.addEventListener("pointerup", handleGlobalUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalMove);
      window.removeEventListener("pointerup", handleGlobalUp);
    };
  }, [camera, gl, minX, maxX, seamIndex, setVerticalBoundary, setIsDragging]);

  const handleSize = 0.06; // 6cm circle

  return (
    <group position={[x, 0, depth / 2 + 0.01]}>
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
        <planeGeometry args={[0.1, height * 0.3]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible circular handle with HTML */}
      <Html center>
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: isDraggingLocal ? "#e0e0e0" : "#ffffff",
            border: `2px solid ${isHovered || isDraggingLocal ? "#0066ff" : "#666666"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isDraggingLocal ? "grabbing" : "grab",
            userSelect: "none",
            boxShadow:
              isHovered || isDraggingLocal
                ? "0 2px 8px rgba(0,102,255,0.3)"
                : "0 1px 3px rgba(0,0,0,0.2)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => !isDraggingRef.current && setIsHovered(false)}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: isHovered || isDraggingLocal ? "#0066ff" : "#666666",
              letterSpacing: 2,
            }}
          >
            {"<>"}
          </span>
        </div>
      </Html>
    </group>
  );
}
