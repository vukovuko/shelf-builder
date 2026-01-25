"use client";

import {
  Bounds,
  Center,
  OrbitControls,
  Environment,
  useBounds,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useRef, useEffect, Suspense } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useShelfStore } from "@/lib/store";
import { BlueprintView } from "./BlueprintView";
import { Wardrobe } from "./Wardrobe";

/**
 * StoreInvalidator - Invalidates R3F scene when Zustand store changes
 * Required because frameloop="demand" doesn't auto-invalidate on external state changes
 */
function StoreInvalidator() {
  const { invalidate } = useThree();
  const width = useShelfStore((s) => s.width);
  const height = useShelfStore((s) => s.height);
  const depth = useShelfStore((s) => s.depth);
  const verticalBoundaries = useShelfStore((s) => s.verticalBoundaries);
  const columnHorizontalBoundaries = useShelfStore(
    (s) => s.columnHorizontalBoundaries,
  );
  const columnHeights = useShelfStore((s) => s.columnHeights);
  const columnModuleBoundaries = useShelfStore((s) => s.columnModuleBoundaries);
  const columnTopModuleShelves = useShelfStore((s) => s.columnTopModuleShelves);
  const elementConfigs = useShelfStore((s) => s.elementConfigs);
  const compartmentExtras = useShelfStore((s) => s.compartmentExtras);
  const hoveredColumnIndex = useShelfStore((s) => s.hoveredColumnIndex);
  const selectedMaterialId = useShelfStore((s) => s.selectedMaterialId);
  const activeAccordionStep = useShelfStore((s) => s.activeAccordionStep);
  const selectedCompartmentKey = useShelfStore((s) => s.selectedCompartmentKey);
  const hoveredCompartmentKey = useShelfStore((s) => s.hoveredCompartmentKey);
  const hasBase = useShelfStore((s) => s.hasBase);
  const baseHeight = useShelfStore((s) => s.baseHeight);
  // Door selection state for Step 5
  const selectedDoorCompartments = useShelfStore(
    (s) => s.selectedDoorCompartments,
  );
  const doorSelectionDragging = useShelfStore((s) => s.doorSelectionDragging);

  useEffect(() => {
    invalidate();
  }, [
    width,
    height,
    depth,
    verticalBoundaries,
    columnHorizontalBoundaries,
    columnHeights,
    columnModuleBoundaries,
    columnTopModuleShelves,
    elementConfigs,
    compartmentExtras,
    hoveredColumnIndex,
    selectedMaterialId,
    activeAccordionStep,
    selectedCompartmentKey,
    hoveredCompartmentKey,
    hasBase,
    baseHeight,
    selectedDoorCompartments,
    doorSelectionDragging,
    invalidate,
  ]);

  return null;
}

/**
 * CameraFitter - Auto-fits camera when wardrobe dimensions change
 * Must be placed inside Bounds component to access useBounds hook
 */
function CameraFitter() {
  const bounds = useBounds();
  const width = useShelfStore((s) => s.width);
  const height = useShelfStore((s) => s.height);
  const depth = useShelfStore((s) => s.depth);

  // Track if this is the first render (skip initial fit - Bounds handles that)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Re-fit camera when dimensions change
    bounds.refresh().fit();
  }, [width, height, depth, bounds]);

  return null;
}

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
    <div className="relative w-full h-full">
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
        {/* Background: dark purple from theme (--background in dark mode) */}
        <color
          attach="background"
          args={[showEdgesOnly ? "#ffffff" : "#2d2a3e"]}
        />

        {/* Basic lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />

        {!showEdgesOnly && <Environment preset="apartment" />}

        {/* Bounds fits camera, CameraFitter re-fits when dimensions change */}
        <Bounds fit clip margin={1.5}>
          <Suspense fallback={null}>
            <Center>
              <Wardrobe ref={wardrobeRef} />
            </Center>
          </Suspense>
          <CameraFitter />
        </Bounds>

        <OrbitControls
          ref={controlsRef}
          enabled={areControlsEnabled && !isDragging}
          makeDefault
          enablePan={true}
          enableZoom={true}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          minDistance={0.5}
          maxDistance={10}
        />

        {/* Invalidate scene when store changes (required for frameloop="demand") */}
        <StoreInvalidator />
      </Canvas>
    </div>
  );
}
