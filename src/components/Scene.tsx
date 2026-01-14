"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useShelfStore } from "@/lib/store";
import { BlueprintView } from "./BlueprintView";
import { Wardrobe } from "./Wardrobe";

// Component to handle WebGL context recovery and visibility changes
function ContextMonitor() {
	const { invalidate } = useThree();
	const store = useShelfStore();

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				invalidate();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [invalidate]);

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
	// ALL HOOKS MUST BE AT THE TOP - before any conditional returns
	const { viewMode } = useShelfStore();
	const showEdgesOnly = useShelfStore((state) => state.showEdgesOnly);
	const _fitRequestId = useShelfStore((state) => state.fitRequestId);
	const materials = useShelfStore((state) => state.materials);

	const controlsRef = useRef<OrbitControlsImpl>(null);
	const sceneGroupRef = useRef<THREE.Group>(null);
	const lastFitRef = useRef<{
		center: THREE.Vector3;
		size: THREE.Vector3;
	} | null>(null);

	const performFit = useCallback(() => {
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

		const tol = 0.001;
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
				return;
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

	useEffect(() => {
		performFit();
	}, [performFit]);

	useEffect(() => {
		if (controlsRef.current && (viewMode === "2D" || viewMode === "Sizing")) {
			// keep angle but allow fitting separately
		}
	}, [viewMode]);

	// NOW we can do conditional returns - after all hooks
	const areControlsEnabled = viewMode === "3D";

	// Wait for materials to load
	if (materials.length === 0) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-sm text-muted-foreground">
						Učitavanje materijala...
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
			camera={{ position: [0, 0, 5], fov: 40 }}
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
			<ContextMonitor />

			{showEdgesOnly && <color attach="background" args={["#ffffff"]} />}
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
