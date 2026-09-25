"use client";

import { useEffect, useState } from "react";

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

// The sidebar and the phone's bottom bar are both mounted and preview the
// same design, so identical requests made moments apart share one fetch
// instead of doubling the load on /api/rules/preview.
const SHARE_MS = 2000;
const recent = new Map<
  string,
  { at: number; result: Promise<RulePreview | null> }
>();

function fetchPreview(body: string): Promise<RulePreview | null> {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (now - entry.at > SHARE_MS) recent.delete(key);
  }
  const shared = recent.get(body);
  if (shared) return shared.result;
  const result = fetch("/api/rules/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((res) => (res.ok ? (res.json() as Promise<RulePreview>) : null))
    .catch(() => null);
  recent.set(body, { at: now, result });
  return result;
}

export function useRulePreview(
  input: RulePreviewInput,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 250;
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // A shared fetch can't be aborted for one caller, so a stale answer
    // (the design changed meanwhile) is just ignored.
    let stale = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      fetchPreview(
        JSON.stringify({
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
      ).then((data) => {
        if (stale) return;
        if (data) setPreview(data);
        setLoading(false);
      });
    }, debounceMs);

    return () => {
      stale = true;
      window.clearTimeout(timeoutId);
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
