"use client"; // This page now renders a client component, so it must be a client component itself.

import { Scene } from "@/components/Scene";

export default function DesignPage() {
  return (
    // The parent div will act as the container for our 3D canvas.
    // We remove the old gray background and padding.
    <div className="h-full w-full">
      <Scene />
    </div>
  );
}
