"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useShelfStore } from "@/lib/store";
import { BlueprintView } from "./BlueprintView";
import { Wardrobe } from "./Wardrobe"; // Import the new assembly component

// Component to handle WebGL context recovery and visibility changes
function ContextMonitor() {
  const { invalidate } = useThree();
  const store = useShelfStore();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Force a render when tab becomes visible to prevent context loss
        invalidate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [invalidate]);

  // Invalidate when store state changes to ensure scene is ready for thumbnail capture
  useEffect(() => {
    invalidate();
  }, [
    store.width,
    store.height,
    store.depth,
    store.numberOfColumns,
    store.rowCounts,
    store.selectedMaterialId,
    store.viewMode,
    store.elementConfigs,
    store.compartmentExtras,
    store.doorSelections,
    invalidate,
  ]);

  return null;
}

export function Scene({ wardrobeRef }: { wardrobeRef: React.RefObject<any> }) {
  // Connect to the store to get the current view mode
  const { viewMode } = useShelfStore();
  const showEdgesOnly = useShelfStore((state) => state.showEdgesOnly);
  const _fitRequestId = useShelfStore((state) => state.fitRequestId);

  // Determine if the controls should be enabled based on the mode
  const areControlsEnabled = viewMode === "3D";

  // For backward compatibility with existing camera mode logic
  const _cameraMode = viewMode === "Sizing" ? "2D" : viewMode;

  // Step 1: Create a reference object. This will hold our "remote control".
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);

  // Cache last fit box to avoid repetitive fitting when nothing changed materially
  const lastFitRef = useRef<{
    center: THREE.Vector3;
    size: THREE.Vector3;
  } | null>(null);
  const performFit = React.useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const group = sceneGroupRef.current;
    const camera = controls.object as THREE.PerspectiveCamera;
    if (!group || !camera) return;

    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Compare with previous to prevent micro jitter re-fit (tolerance 1mm)
    const tol = 0.001; // world units (m)
    if (lastFitRef.current) {
      const prev = lastFitRef.current;
      if (
        Math.abs(prev.center.x - center.x) < tol &&
        Math.abs(prev.center.y - center.y) < tol &&
        Math.abs(prev.center.z - center.z) < tol &&
        Math.abs(prev.size.x - size.x) < tol &&
        Math.abs(prev.size.y - size.y) < tol &&
        Math.abs(prev.size.z - size.z) < tol
      ) {
        return; // No meaningful change
      }
    }

    lastFitRef.current = {
      center: center.clone(),
      size: size.clone(),
    };

    const padding = 0.05;
    size.multiplyScalar(1 + padding);
    const maxSize = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
    const distance = fitHeightDistance + 0.5;
    const dir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();
    const newPos = new THREE.Vector3().addVectors(
      center,
      dir.multiplyScalar(distance),
    );
    controls.target.copy(center);
    camera.position.copy(newPos);
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  // When request id changes, fit
  useEffect(() => {
    performFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performFit]);

  // Step 2: Use a useEffect hook to watch for changes to viewMode.
  useEffect(() => {
    if (controlsRef.current && (viewMode === "2D" || viewMode === "Sizing")) {
      // keep angle but allow fitting separately
    }
  }, [viewMode]);

  // Render different views based on the selected view mode
  if (viewMode === "Sizing") {
    return <BlueprintView />;
  }

  return (
    <Canvas
      className="w-full h-full"
      shadows
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        antialias: true,
      }}
      onCreated={({ gl }) => {
        // Handle context loss
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          console.warn("WebGL context lost");
        });

        gl.domElement.addEventListener("webglcontextrestored", () => {
          console.log("WebGL context restored");
        });
      }}
    >
      {/* Monitor for WebGL context and page visibility */}
      <ContextMonitor />

      {/* White background for technical 2D export */}
      {showEdgesOnly && <color attach="background" args={["#ffffff"]} />}
      {/* Clean, shadowless lighting */}
      {!showEdgesOnly && (
        <>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <directionalLight
            castShadow
            position={[5, 10, 7.5]}
            intensity={1}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
            shadow-camera-near={0.5}
            shadow-camera-far={50}
          />
          {/* Subtle fill light from front to illuminate interior depth */}
          <pointLight position={[0, 1, 3]} intensity={0.3} color="#ffffff" />
          <pointLight
            position={[0, 0.5, 2.5]}
            intensity={0.2}
            color="#ffffff"
          />
        </>
      )}

      <group position={[0, 0, 0]} ref={sceneGroupRef}>
        <Wardrobe ref={wardrobeRef} />
      </group>

      {!showEdgesOnly && (
        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
        >
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
      )}

      <OrbitControls
        ref={controlsRef}
        enabled={areControlsEnabled}
        makeDefault
        minPolarAngle={areControlsEnabled ? 0 : Math.PI / 2}
        maxPolarAngle={areControlsEnabled ? Math.PI : Math.PI / 2}
      />
    </Canvas>
  );
}
