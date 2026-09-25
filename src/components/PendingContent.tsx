"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Button content that swaps to a spinner while `pending`. The content stays
 * in place but invisible, so the button keeps its exact size.
 */
export function PendingContent({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center justify-center gap-2">
      <span
        className={cn("inline-flex items-center gap-2", pending && "invisible")}
      >
        {children}
      </span>
      {pending && (
        <Loader2
          aria-label="Učitavanje"
          className="absolute inset-0 m-auto size-4 animate-spin"
        />
      )}
    </span>
  );
}

/** PendingContent for a <Link>'s children: spins while that link is loading. */
export function LinkPending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <PendingContent pending={pending}>{children}</PendingContent>;
}
