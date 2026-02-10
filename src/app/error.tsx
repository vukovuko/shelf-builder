"use client";

import Image from "next/image";
import posthog from "posthog-js";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <h2 className="mb-6 text-5xl font-semibold">Ups!</h2>
        <h3 className="mb-1.5 text-3xl font-semibold">Nešto je pošlo po zlu</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Došlo je do greške. Molimo vas pokušajte ponovo ili se vratite nazad.
        </p>
        <div className="flex gap-3">
          <Button
            size="lg"
            className="rounded-lg text-base"
            onClick={() => reset()}
          >
            Pokušaj ponovo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-lg text-base"
            onClick={() => window.history.back()}
          >
            Nazad
          </Button>
        </div>
      </div>

      <div className="relative max-h-screen w-full p-2 max-lg:hidden">
        <div className="h-full w-full rounded-2xl bg-black"></div>
        <Image
          src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/error/image-1.png"
          alt="greška ilustracija"
          width={406}
          height={406}
          className="absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] w-auto -translate-x-1/2 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
