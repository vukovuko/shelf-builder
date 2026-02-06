"use client";

import { Line, Html } from "@react-three/drei";
import type { Vector3Tuple } from "three";

interface DimensionLines3DProps {
  width: number; // meters
  height: number; // meters
  depth: number; // meters
  panelThickness: number; // meters
  hasBase: boolean;
  baseHeight: number; // meters
}

/**
 * 3D Dimension Lines (Kotiranje)
 * Shows outer dimensions with white lines and labels
 *
 * Coordinate system (floor-origin):
 * - Y = 0 at floor, Y = h at top
 * - X: -w/2 (left) to +w/2 (right)
 * - Z: -d/2 (back) to +d/2 (front)
 */
export function DimensionLines3D({
  width,
  height,
  depth,
  panelThickness,
  hasBase,
  baseHeight,
}: DimensionLines3DProps) {
  const w = width;
  const h = height;
  const d = depth;
  const t = panelThickness;
  const baseH = hasBase ? baseHeight : 0;

  // Offsets for dimension lines (distance from wardrobe)
  const mainOffset = 0.1; // 10cm for total height line
  const baseOffset = 0.05; // 5cm for base height line (closer)
  const tickSize = 0.02; // 2cm tick marks
  const bottomOffset = 0.08; // 8cm below wardrobe for width line
  const sideOffset = 0.08; // 8cm to the side for depth line

  // Z position - front face
  const zFront = d / 2;

  // Convert meters to cm for display
  const toCm = (m: number) => Math.round(m * 100);

  return (
    <group>
      {/* ============================================ */}
      {/* TOTAL HEIGHT - Left side (far) */}
      {/* ============================================ */}
      <group>
        {/* Main vertical line */}
        <Line
          points={[
            [-w / 2 - mainOffset, 0, zFront] as Vector3Tuple,
            [-w / 2 - mainOffset, h, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Bottom tick */}
        <Line
          points={[
            [-w / 2 - mainOffset - tickSize, 0, zFront] as Vector3Tuple,
            [-w / 2 - mainOffset + tickSize, 0, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Top tick */}
        <Line
          points={[
            [-w / 2 - mainOffset - tickSize, h, zFront] as Vector3Tuple,
            [-w / 2 - mainOffset + tickSize, h, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Label */}
        <Html
          position={[-w / 2 - mainOffset - 0.04, h / 2, zFront]}
          center
          zIndexRange={[0, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              textShadow: "0 0 4px rgba(0,0,0,0.8)",
              transform: "rotate(-90deg)",
            }}
          >
            {toCm(h)} cm
          </div>
        </Html>
      </group>

      {/* ============================================ */}
      {/* BASE HEIGHT - Left side (close) - only if base exists */}
      {/* ============================================ */}
      {hasBase && baseH > 0 && (
        <group>
          {/* Vertical line for base */}
          <Line
            points={[
              [-w / 2 - baseOffset, 0, zFront] as Vector3Tuple,
              [-w / 2 - baseOffset, baseH, zFront] as Vector3Tuple,
            ]}
            color="white"
            lineWidth={1}
          />
          {/* Bottom tick */}
          <Line
            points={[
              [-w / 2 - baseOffset - tickSize / 2, 0, zFront] as Vector3Tuple,
              [-w / 2 - baseOffset + tickSize / 2, 0, zFront] as Vector3Tuple,
            ]}
            color="white"
            lineWidth={1}
          />
          {/* Top tick */}
          <Line
            points={[
              [
                -w / 2 - baseOffset - tickSize / 2,
                baseH,
                zFront,
              ] as Vector3Tuple,
              [
                -w / 2 - baseOffset + tickSize / 2,
                baseH,
                zFront,
              ] as Vector3Tuple,
            ]}
            color="white"
            lineWidth={1}
          />
          {/* Label */}
          <Html
            position={[-w / 2 - baseOffset + 0.03, baseH / 2, zFront]}
            center
            zIndexRange={[0, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                color: "white",
                fontSize: "11px",
                whiteSpace: "nowrap",
                textShadow: "0 0 4px rgba(0,0,0,0.8)",
              }}
            >
              {toCm(baseH)}
            </div>
          </Html>
        </group>
      )}

      {/* ============================================ */}
      {/* TOTAL WIDTH - Bottom */}
      {/* ============================================ */}
      <group>
        {/* Main horizontal line */}
        <Line
          points={[
            [-w / 2, -bottomOffset, zFront] as Vector3Tuple,
            [w / 2, -bottomOffset, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Left tick */}
        <Line
          points={[
            [-w / 2, -bottomOffset - tickSize, zFront] as Vector3Tuple,
            [-w / 2, -bottomOffset + tickSize, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Right tick */}
        <Line
          points={[
            [w / 2, -bottomOffset - tickSize, zFront] as Vector3Tuple,
            [w / 2, -bottomOffset + tickSize, zFront] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Label */}
        <Html
          position={[0, -bottomOffset - 0.04, zFront]}
          center
          zIndexRange={[0, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              textShadow: "0 0 4px rgba(0,0,0,0.8)",
            }}
          >
            {toCm(w)} cm
          </div>
        </Html>
      </group>

      {/* ============================================ */}
      {/* TOTAL DEPTH - Right side */}
      {/* ============================================ */}
      <group>
        {/* Main horizontal line (along Z axis) */}
        <Line
          points={[
            [w / 2 + sideOffset, 0, -d / 2] as Vector3Tuple,
            [w / 2 + sideOffset, 0, d / 2] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Back tick */}
        <Line
          points={[
            [w / 2 + sideOffset - tickSize, 0, -d / 2] as Vector3Tuple,
            [w / 2 + sideOffset + tickSize, 0, -d / 2] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Front tick */}
        <Line
          points={[
            [w / 2 + sideOffset - tickSize, 0, d / 2] as Vector3Tuple,
            [w / 2 + sideOffset + tickSize, 0, d / 2] as Vector3Tuple,
          ]}
          color="white"
          lineWidth={1.5}
        />
        {/* Label */}
        <Html
          position={[w / 2 + sideOffset + 0.04, 0, 0]}
          center
          zIndexRange={[0, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              textShadow: "0 0 4px rgba(0,0,0,0.8)",
            }}
          >
            {toCm(d)} cm
          </div>
        </Html>
      </group>
    </group>
  );
}
