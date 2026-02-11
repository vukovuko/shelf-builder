"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useSession } from "@/lib/auth-client";

function PostHogIdentify() {
  const { data: session, isPending } = useSession();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    // Don't act while session is still loading
    if (isPending) return;

    const userId = session?.user?.id ?? null;
    if (userId === prevUserId.current) return;
    prevUserId.current = userId;

    if (userId) {
      posthog.identify(userId, {
        email: session?.user?.email,
        name: session?.user?.name,
      });
    } else if (posthog._isIdentified()) {
      posthog.reset();
    }
  }, [session?.user?.id, isPending]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
