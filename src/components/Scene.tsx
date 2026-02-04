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
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useShelfStore, type ShelfState, type ViewMode } from "@/lib/store";
import { BlueprintView } from "./BlueprintView";
import { Wardrobe } from "./Wardrobe";

/**
 * StoreInvalidator - Invalidates R3F scene when Zustand store changes
 * Required because frameloop="demand" doesn't auto-invalidate on external state changes
 */
function StoreInvalidator() {
  const { invalidate } = useThree();
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const depth = useShelfStore((s: ShelfState) => s.depth);
  const viewMode = useShelfStore((s: ShelfState) => s.viewMode);
  const verticalBoundaries = useShelfStore(
    (s: ShelfState) => s.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (s: ShelfState) => s.columnHorizontalBoundaries,
  );
  const columnHeights = useShelfStore((s: ShelfState) => s.columnHeights);
  const columnModuleBoundaries = useShelfStore(
    (s: ShelfState) => s.columnModuleBoundaries,
  );
  const columnTopModuleShelves = useShelfStore(
    (s: ShelfState) => s.columnTopModuleShelves,
  );
  const elementConfigs = useShelfStore((s: ShelfState) => s.elementConfigs);
  const compartmentExtras = useShelfStore(
    (s: ShelfState) => s.compartmentExtras,
  );
  const hoveredColumnIndex = useShelfStore(
    (s: ShelfState) => s.hoveredColumnIndex,
  );
  const selectedColumnIndex = useShelfStore(
    (s: ShelfState) => s.selectedColumnIndex,
  );
  const selectedMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedMaterialId,
  );
  const activeAccordionStep = useShelfStore(
    (s: ShelfState) => s.activeAccordionStep,
  );
  const selectedCompartmentKey = useShelfStore(
    (s: ShelfState) => s.selectedCompartmentKey,
  );
  const hoveredCompartmentKey = useShelfStore(
    (s: ShelfState) => s.hoveredCompartmentKey,
  );
  const hasBase = useShelfStore((s: ShelfState) => s.hasBase);
  const baseHeight = useShelfStore((s: ShelfState) => s.baseHeight);
  // Door selection state for Step 5
  const selectedDoorCompartments = useShelfStore(
    (s: ShelfState) => s.selectedDoorCompartments,
  );
  const doorSelectionDragging = useShelfStore(
    (s: ShelfState) => s.doorSelectionDragging,
  );
  // Door groups for 3D rendering
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const showDoors = useShelfStore((s: ShelfState) => s.showDoors);
  // Dimension lines toggle
  const showDimensions = useShelfStore((s: ShelfState) => s.showDimensions);
  // Edges only mode (for download)
  const showEdgesOnly = useShelfStore((s: ShelfState) => s.showEdgesOnly);
  // Fit request trigger
  const fitRequestId = useShelfStore((s: ShelfState) => s.fitRequestId);

  useEffect(() => {
    invalidate();
  }, [
    width,
    height,
    depth,
    viewMode,
    verticalBoundaries,
    columnHorizontalBoundaries,
    columnHeights,
    columnModuleBoundaries,
    columnTopModuleShelves,
    elementConfigs,
    compartmentExtras,
    hoveredColumnIndex,
    selectedColumnIndex,
    selectedMaterialId,
    activeAccordionStep,
    selectedCompartmentKey,
    hoveredCompartmentKey,
    hasBase,
    baseHeight,
    selectedDoorCompartments,
    doorSelectionDragging,
    doorGroups,
    showDoors,
    showDimensions,
    showEdgesOnly,
    fitRequestId,
    invalidate,
  ]);

  return null;
}

/**
 * CameraFitter - Auto-fits camera when wardrobe dimensions change or fit is requested
 * Must be placed inside Bounds component to access useBounds hook
 */
function CameraFitter() {
  const bounds = useBounds();
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const depth = useShelfStore((s: ShelfState) => s.depth);
  const fitRequestId = useShelfStore((s: ShelfState) => s.fitRequestId);

  // Track if this is the first render (skip initial fit - Bounds handles that)
  const isFirstRender = useRef(true);
  const lastFitRequestId = useRef(fitRequestId);

  // Delayed initial fit for mobile - re-fit after UI settles
  // This ensures camera accounts for mobile header/footer padding
  useEffect(() => {
    const timer = setTimeout(() => {
      bounds.refresh().fit();
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when dimensions change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    bounds.refresh().fit();
  }, [width, height, depth, bounds]);

  // Re-fit when explicitly requested via triggerFitToView()
  useEffect(() => {
    if (fitRequestId !== lastFitRequestId.current) {
      lastFitRequestId.current = fitRequestId;
      bounds.refresh().fit();
    }
  }, [fitRequestId, bounds]);

  return null;
}

/**
 * ViewModeController - Handles camera positioning for 2D/3D view modes
 * Resets camera to front view when switching to 2D, restores controls for 3D
 */
function ViewModeController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, gl, invalidate } = useThree();
  const viewMode = useShelfStore((s: ShelfState) => s.viewMode);
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const forceFrontViewId = useShelfStore((s: ShelfState) => s.forceFrontViewId);
  const prevViewMode = useRef<ViewMode>(viewMode);
  const lastForceFrontViewId = useRef(forceFrontViewId);

  // Helper to position camera at front view
  const setCameraFrontView = React.useCallback(() => {
    const w = width / 100; // Convert cm to meters
    const h = height / 100;

    const perspCam = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCam.fov * Math.PI) / 180;

    // Get canvas aspect ratio for proper width calculation
    const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;

    // Distance needed to fit width (accounting for aspect ratio)
    const distanceForWidth = w / 2 / Math.tan(fovRad / 2) / aspect;

    // Distance needed to fit height
    const distanceForHeight = h / 2 / Math.tan(fovRad / 2);

    // Use whichever requires more distance (ensures both fit)
    const margin = 1.35; // 35% margin for comfortable fit
    const distance = Math.max(distanceForWidth, distanceForHeight) * margin;

    // Position camera in front (minimum 1m distance)
    camera.position.set(0, 0, Math.max(distance, 1));
    camera.rotation.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Reset OrbitControls target and rotation
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }

    invalidate();
  }, [camera, gl, width, height, controlsRef, invalidate]);

  // Handle viewMode changes (2D/3D toggle)
  useEffect(() => {
    // Only act when viewMode changes
    if (prevViewMode.current === viewMode) return;
    prevViewMode.current = viewMode;

    if (viewMode === "2D") {
      setCameraFrontView();
    }
  }, [viewMode, setCameraFrontView]);

  // Force front view when triggered (for Ivice download - after Bounds.fit())
  useEffect(() => {
    if (forceFrontViewId !== lastForceFrontViewId.current) {
      lastForceFrontViewId.current = forceFrontViewId;
      setCameraFrontView();
    }
  }, [forceFrontViewId, setCameraFrontView]);

  return null;
}

export function Scene({ wardrobeRef }: { wardrobeRef: React.RefObject<any> }) {
  const viewMode = useShelfStore((state: ShelfState) => state.viewMode);
  const showEdgesOnly = useShelfStore(
    (state: ShelfState) => state.showEdgesOnly,
  );
  const materials = useShelfStore((state: ShelfState) => state.materials);
  const isDragging = useShelfStore((state: ShelfState) => state.isDragging);

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

        {/* Basic lighting - flat lighting in edges mode for clean download */}
        <ambientLight intensity={showEdgesOnly ? 1.0 : 0.6} />
        {!showEdgesOnly && (
          <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
        )}

        {!showEdgesOnly && <Environment preset="studio" />}

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
          enablePan={areControlsEnabled}
          enableZoom={areControlsEnabled}
          enableRotate={areControlsEnabled}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          minDistance={0.5}
          maxDistance={10}
        />

        {/* Handle camera positioning for 2D/3D view modes */}
        <ViewModeController controlsRef={controlsRef} />

        {/* Invalidate scene when store changes (required for frameloop="demand") */}
        <StoreInvalidator />
      </Canvas>
    </div>
  );
}
