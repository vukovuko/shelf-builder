"use client";
import type React from "react";

// Better Auth doesn't require a session provider wrapper
// Session is handled automatically via cookies
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
