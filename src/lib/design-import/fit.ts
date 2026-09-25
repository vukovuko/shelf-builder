/**
 * Pure geometry helpers for turning loose sketch proportions into positions
 * the configurator accepts. No store access, so every edge case is testable.
 */

/**
 * Splits `totalCm` into whole-cm widths that follow `ratios` as closely as
 * possible while keeping each width inside [min, maxCm] and summing exactly
 * to `totalCm`. `minCm` may differ per width. Callers must pass a feasible
 * combination (sum of minimums <= totalCm <= ratios.length * maxCm).
 */
export function distributeWidths(
  ratios: number[],
  totalCm: number,
  minCm: number | number[],
  maxCm: number,
): number[] {
  const n = ratios.length;
  if (n === 0) return [];
  const safe = ratios.map((r) => (Number.isFinite(r) && r > 0 ? r : 1));
  const mins = Array.isArray(minCm) ? minCm : Array(n).fill(minCm);
  const locked: (number | null)[] = Array(n).fill(null);

  // Clamp-and-redistribute: pin widths that break a limit, share the rest.
  for (let pass = 0; pass < n; pass++) {
    const free = safe.map((_, i) => i).filter((i) => locked[i] === null);
    const lockedSum = locked.reduce<number>((s, v) => s + (v ?? 0), 0);
    const freeRatio = free.reduce((s, i) => s + safe[i], 0);
    const remaining = totalCm - lockedSum;
    let changed = false;
    for (const i of free) {
      const w = (safe[i] / freeRatio) * remaining;
      if (w < mins[i]) {
        locked[i] = mins[i];
        changed = true;
      } else if (w > maxCm) {
        locked[i] = maxCm;
        changed = true;
      }
    }
    if (!changed) {
      for (const i of free) locked[i] = (safe[i] / freeRatio) * remaining;
      break;
    }
  }

  // Whole cm, then push the rounding remainder onto widths with headroom.
  const widths = locked.map((w) => Math.round(w ?? totalCm / n));
  let diff = totalCm - widths.reduce((s, w) => s + w, 0);
  for (let guard = 0; diff !== 0 && guard < 1000; guard++) {
    const step = diff > 0 ? 1 : -1;
    const idx = widths.findIndex((w, i) =>
      step > 0 ? w + 1 <= maxCm : w - 1 >= mins[i],
    );
    if (idx === -1) break;
    widths[idx] += step;
    diff -= step;
  }
  return widths;
}

/**
 * Splits sections (by width ratio) into `groupCount` contiguous groups so the
 * group widths are as even as possible and none exceeds `maxShare` of the
 * total. Returns the section count of each group, left to right.
 */
export function groupSections(
  ratios: number[],
  groupCount: number,
  maxShare = 1,
): number[] {
  const k = ratios.length;
  if (groupCount >= k) return Array(k).fill(1);
  const total = ratios.reduce((s, r) => s + r, 0);
  let best: number[] | null = null;
  let bestScore = Infinity;

  const walk = (start: number, groupsLeft: number, acc: number[]) => {
    if (groupsLeft === 1) {
      const sizes = [...acc, k - start];
      const shares: number[] = [];
      let pos = 0;
      for (const size of sizes) {
        const share = ratios.slice(pos, pos + size).reduce((s, r) => s + r, 0);
        shares.push(share / total);
        pos += size;
      }
      const overflow = shares.reduce(
        (s, sh) => s + Math.max(0, sh - maxShare),
        0,
      );
      const mean = 1 / sizes.length;
      const spread = shares.reduce((s, sh) => s + (sh - mean) ** 2, 0);
      const score = overflow * 1000 + spread;
      if (score < bestScore) {
        bestScore = score;
        best = sizes;
      }
      return;
    }
    for (let size = 1; start + size <= k - (groupsLeft - 1); size++) {
      walk(start + size, groupsLeft - 1, [...acc, size]);
    }
  };

  walk(0, groupCount, []);
  return best ?? Array(groupCount).fill(1);
}

/**
 * Places shelves between `floorY` and `ceilingY` (inner surfaces, meters) so
 * every opening keeps at least `minGapM` of clear height. Wanted positions
 * are kept where possible, nudged apart when too close, and replaced by an
 * even spread when they cannot fit. Returns sorted shelf centre positions.
 */
export function fitShelves(
  wantedY: number[],
  floorY: number,
  ceilingY: number,
  panelT: number,
  minGapM: number,
  maxCount: number,
): number[] {
  const count = Math.max(0, Math.min(wantedY.length, maxCount));
  if (count === 0) return [];
  const pitch = minGapM + panelT;
  const lowest = floorY + minGapM + panelT / 2;
  const highest = ceilingY - minGapM - panelT / 2;
  if (highest < lowest) return [];

  // Each of the n+1 openings needs pitch = clear gap + one panel.
  const even = () => {
    const usable = ceilingY - floorY;
    const n = Math.min(count, Math.floor(usable / pitch) - 1);
    return Array.from(
      { length: Math.max(0, n) },
      (_, i) => floorY + ((i + 1) * usable) / (n + 1),
    );
  };

  const valid = wantedY.filter((y) => Number.isFinite(y));
  if (valid.length > count) return even();
  const sorted = valid
    .sort((a, b) => a - b)
    .map((y) => Math.min(highest, Math.max(lowest, y)));
  if (sorted.length === 0) return [];

  for (let i = 1; i < sorted.length; i++) {
    sorted[i] = Math.max(sorted[i], sorted[i - 1] + pitch);
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const cap = i === sorted.length - 1 ? highest : sorted[i + 1] - pitch;
    sorted[i] = Math.min(sorted[i], cap);
  }
  const fits =
    sorted[0] >= lowest - 1e-9 &&
    sorted.every((y, i) => i === 0 || y - sorted[i - 1] >= pitch - 1e-9);
  return fits ? sorted : even();
}
