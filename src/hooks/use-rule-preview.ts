"use client";

import { useEffect, useRef, useState } from "react";

type RulePreview = {
  adjustedTotal: number | null;
  visibleAdjustments: { description: string; amount: number }[] | null;
};

type RulePreviewInput = {
  wardrobeSnapshot: Record<string, any>;
  materialId: number;
  frontMaterialId: number;
  backMaterialId: number | null;
  totalPrice: number;
  totalArea: number;
  customerEmail?: string;
  customerPhone?: string;
  shippingCity?: string;
};

export function useRulePreview(
  input: RulePreviewInput,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 250;
  const abortRef = useRef<AbortController | null>(null);
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch("/api/rules/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          wardrobeSnapshot: input.wardrobeSnapshot,
          materialId: input.materialId,
          frontMaterialId: input.frontMaterialId,
          backMaterialId: input.backMaterialId,
          totalPrice: Math.round(input.totalPrice),
          totalArea: input.totalArea,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingCity: input.shippingCity,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setPreview(data);
          }
          setLoading(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [
    enabled,
    debounceMs,
    input.wardrobeSnapshot,
    input.materialId,
    input.frontMaterialId,
    input.backMaterialId,
    input.totalPrice,
    input.totalArea,
    input.customerEmail,
    input.customerPhone,
    input.shippingCity,
  ]);

  return { preview, loading };
}