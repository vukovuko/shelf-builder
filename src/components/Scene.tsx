"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Wardrobe } from "./Wardrobe"; // Import the new assembly component
import { BlueprintView } from "./BlueprintView";
import React from "react";
import { useShelfStore } from "@/lib/store";
import { useRef, useEffect } from "react";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export function Scene({ wardrobeRef }: { wardrobeRef: React.RefObject<any> }) {
  // Connect to the store to get the current view mode
  const { viewMode } = useShelfStore();
  const showEdgesOnly = useShelfStore(state => state.showEdgesOnly);
  const fitRequestId = useShelfStore(state => state.fitRequestId);

  // Determine if the controls should be enabled based on the mode
  const areControlsEnabled = viewMode === "3D";

  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;

  // Step 1: Create a reference object. This will hold our "remote control".
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);

  const performFit = React.useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // target group is the wardrobe container group below
    const group = sceneGroupRef.current;
    const camera = controls.object as THREE.PerspectiveCamera;
    const dom = (controls as any).domElement as HTMLElement | undefined;
    if (!group || !camera || !dom) return;

    // compute world-space bounding box
    const box = new THREE.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Pad a bit
      const padding = 0.05; // 5%
      size.multiplyScalar(1 + padding);

      // Fit for perspective camera
      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
      const fitWidthDistance = fitHeightDistance; // square canvas assumption is fine here
      const distance = Math.max(fitHeightDistance, fitWidthDistance) + 0.5;

      const dir = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();
      const newPos = new THREE.Vector3().addVectors(
        center,
        dir.multiplyScalar(distance)
      );

      controls.target.copy(center);
      camera.position.copy(newPos);
      camera.updateProjectionMatrix();
      controls.update();
    }
  }, []);

  // When request id changes, fit
  useEffect(() => {
    performFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

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
    <Canvas shadows camera={{ position: [0, 0, 5], fov: 40 }}>
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
          />
        </>
      )}

      <group position={[0, -0.5, 0]} ref={sceneGroupRef}>
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
