"use client";

import { Bounds, Center, OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useShelfStore } from "@/lib/store";
import { BlueprintView } from "./BlueprintView";
import { Wardrobe } from "./Wardrobe";

export function Scene({ wardrobeRef }: { wardrobeRef: React.RefObject<any> }) {
  const { viewMode } = useShelfStore();
  const showEdgesOnly = useShelfStore((state) => state.showEdgesOnly);
  const materials = useShelfStore((state) => state.materials);
  const isDragging = useShelfStore((state) => state.isDragging);

  const controlsRef = useRef<OrbitControlsImpl>(null);

  const areControlsEnabled = viewMode === "3D";

  // Wait for materials to load
  if (materials.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Ucitavanje materijala...
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "Sizing") {
    return <BlueprintView />;
  }

  return (
    <Canvas
      className="w-full h-full"
      shadows
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        antialias: true,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
        });
        gl.domElement.addEventListener("webglcontextrestored", () => {});
      }}
    >
      <color
        attach="background"
        args={[showEdgesOnly ? "#ffffff" : "#f0f0f0"]}
      />

      {/* Basic lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />

      {!showEdgesOnly && <Environment preset="apartment" />}

      {/* Bounds fits camera on initial load only (no observe = no auto-refit on changes) */}
      <Bounds fit clip margin={1.5}>
        <Center>
          <Wardrobe ref={wardrobeRef} />
        </Center>
      </Bounds>

      <OrbitControls
        ref={controlsRef}
        enabled={areControlsEnabled && !isDragging}
        makeDefault
        enablePan={true}
        enableZoom={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={1.65}
        maxDistance={3}
      />
    </Canvas>
  );
}
