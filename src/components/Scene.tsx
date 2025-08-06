"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Wardrobe } from "./Wardrobe"; // Import the new assembly component
import { useShelfStore } from "@/lib/store";
import { useRef, useEffect } from "react";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export function Scene() {
  // Connect to the store to get the current camera mode
  const { cameraMode } = useShelfStore();

  // Determine if the controls should be enabled based on the mode
  const areControlsEnabled = cameraMode === "3D";

  // Step 1: Create a reference object. This will hold our "remote control".
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Step 2: Use a useEffect hook to watch for changes to cameraMode.
  useEffect(() => {
    // If we have our remote control AND the mode switches to "2D"...
    if (controlsRef.current && cameraMode === "2D") {
      // ...then tell the camera controls to reset.
      controlsRef.current.reset();
    }
  }, [cameraMode]); // This effect re-runs only when cameraMode changes.

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      {/* Clean, shadowless lighting */}
      <Environment preset="city" />
      <ambientLight intensity={1.0} />

      <group position-y={-1}>
        <Wardrobe />
      </group>

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
