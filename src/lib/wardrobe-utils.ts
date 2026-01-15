import {
  MAX_SEGMENT_X,
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
} from "./wardrobe-constants";

/**
 * Converts 0-based index to Excel-style column letters.
 * 0 -> "A", 25 -> "Z", 26 -> "AA"
 */
export function toLetters(num: number): string {
  let n = num + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Split wardrobe width into blocks of max 100cm each.
 */
export function buildBlocksX(
  w: number,
): { start: number; end: number; width: number }[] {
  const nBlocksX = Math.max(1, Math.ceil(w / MAX_SEGMENT_X));
  const segWX = w / nBlocksX;
  return Array.from({ length: nBlocksX }, (_, i) => {
    const start = -w / 2 + i * segWX;
    return { start, end: start + segWX, width: segWX };
  });
}

/**
 * Split wardrobe height into vertical modules.
 * If h > 200cm, splits into bottom (200cm) + top (remainder, min 10cm).
 */
export function buildModulesY(
  h: number,
  includeLabel = false,
): { yStart: number; yEnd: number; height: number; label?: string }[] {
  if (h > TARGET_BOTTOM_HEIGHT) {
    const yStartBottom = -h / 2;
    const bottomH =
      h - TARGET_BOTTOM_HEIGHT < MIN_TOP_HEIGHT
        ? h - MIN_TOP_HEIGHT
        : TARGET_BOTTOM_HEIGHT;
    const yEndBottom = yStartBottom + bottomH;

    return [
      {
        yStart: yStartBottom,
        yEnd: yEndBottom,
        height: bottomH,
        ...(includeLabel && { label: "BottomModule" }),
      },
      {
        yStart: yEndBottom,
        yEnd: h / 2,
        height: h / 2 - yEndBottom,
        ...(includeLabel && { label: "TopModule" }),
      },
    ];
  }
  return [
    {
      yStart: -h / 2,
      yEnd: h / 2,
      height: h,
      ...(includeLabel && { label: "SingleModule" }),
    },
  ];
}

/**
 * Get all element keys (A, B, C, ...) for a given wardrobe size.
 */
export function getElementKeys(w: number, h: number): string[] {
  const blocksX = buildBlocksX(w);
  const modulesY = buildModulesY(h);
  const totalElements = blocksX.length * modulesY.length;
  return Array.from({ length: totalElements }, (_, i) => toLetters(i));
}
