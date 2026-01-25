import type { DoorOption } from "@/lib/store";
import {
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
  DRAWER_HEIGHT,
  DRAWER_GAP,
} from "./wardrobe-constants";
import { buildBlocksX } from "./wardrobe-utils";
import handlesData from "@/lib/handles.json";

type PricingMaterial = {
  id: number;
  price: number;
  thickness: number | null;
  categories: string[];
};

type ElementConfig = {
  columns: number;
  rowCounts: number[];
};

type CompartmentExtras = {
  verticalDivider?: boolean;
  drawers?: boolean;
  drawersCount?: number;
  rod?: boolean;
  led?: boolean;
};

// Door group with per-door settings
type DoorGroup = {
  id: string;
  type: DoorOption;
  compartments: string[];
  column: string;
  materialId?: number;
  handleId?: string;
  handleFinish?: string;
};

export type WardrobeSnapshot = {
  width: number;
  height: number;
  depth: number;
  selectedMaterialId: number;
  selectedFrontMaterialId?: number | null;
  selectedBackMaterialId?: number | null;
  elementConfigs?: Record<string, ElementConfig>;
  compartmentExtras?: Record<string, CompartmentExtras>;
  doorSelections?: Record<string, DoorOption>;
  hasBase?: boolean;
  baseHeight?: number;
  // Structural data - MUST be used for accurate calculations
  verticalBoundaries?: number[]; // X positions of vertical seams (in meters from center)
  columnHorizontalBoundaries?: Record<number, number[]>; // Y positions of shelves per column
  columnModuleBoundaries?: Record<number, number | null>; // Module split Y position per column
  // Door groups with per-door settings
  doorGroups?: DoorGroup[];
  // Global handle settings
  globalHandleId?: string;
  globalHandleFinish?: string;
  // Door settings mode
  doorSettingsMode?: "global" | "per-door";
};

export type MaterialType = "korpus" | "front" | "back" | "handles";

export type CutListItem = {
  code: string;
  desc: string;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  areaM2: number;
  cost: number;
  element: string;
  materialType: MaterialType;
};

export type PriceBreakdown = {
  korpus: { areaM2: number; price: number };
  front: { areaM2: number; price: number };
  back: { areaM2: number; price: number };
  handles: { count: number; price: number };
};

export type CutList = {
  items: CutListItem[];
  grouped: Record<string, CutListItem[]>;
  totalArea: number;
  totalCost: number;
  pricePerM2: number;
  priceBreakdown: PriceBreakdown;
};

const emptyCutList: CutList = {
  items: [],
  grouped: {},
  totalArea: 0,
  totalCost: 0,
  pricePerM2: 0,
  priceBreakdown: {
    korpus: { areaM2: 0, price: 0 },
    front: { areaM2: 0, price: 0 },
    back: { areaM2: 0, price: 0 },
    handles: { count: 0, price: 0 },
  },
};

/**
 * Calculate cut list following exact CarcassFrame structure:
 * - Uses verticalBoundaries for actual column widths
 * - Uses columnHorizontalBoundaries for shelf positions
 * - Correctly counts side panels (2 outer + seam panels)
 * - Adds module boundary panels when h > 200cm
 */
export function calculateCutList(
  snapshot: WardrobeSnapshot,
  materials: PricingMaterial[],
): CutList {
  try {
    if (!snapshot || materials.length === 0) {
      return emptyCutList;
    }

    const elementConfigs = snapshot.elementConfigs ?? {};
    const compartmentExtras = snapshot.compartmentExtras ?? {};
    const doorSelections = snapshot.doorSelections ?? {};
    const hasBase = snapshot.hasBase ?? false;
    const baseHeight = snapshot.baseHeight ?? 0;
    const baseH = baseHeight / 100; // Convert to meters

    // Door groups and handle settings
    const doorGroups = snapshot.doorGroups ?? [];
    const globalHandleId = snapshot.globalHandleId ?? "handle_1";
    const globalHandleFinish = snapshot.globalHandleFinish ?? "chrome";
    const doorSettingsMode = snapshot.doorSettingsMode ?? "global";

    // Get materials and prices
    const mat = materials.find(
      (m) => String(m.id) === String(snapshot.selectedMaterialId),
    );
    if (!mat) {
      return emptyCutList;
    }

    const pricePerM2 = Number(mat?.price ?? 0);
    const t = (Number(mat?.thickness ?? 18) / 1000) as number; // meters
    const backT = 5 / 1000; // 5mm back panel

    // Front material (Lica/Vrata) - for doors and drawer fronts
    const frontId = snapshot.selectedFrontMaterialId ?? null;
    const frontMat = frontId
      ? materials.find((m) => String(m.id) === String(frontId))
      : mat;
    const frontPricePerM2 = Number(frontMat?.price ?? pricePerM2);
    const frontT = (Number(frontMat?.thickness ?? 18) / 1000) as number;

    // Back material (Leđa)
    const backId = snapshot.selectedBackMaterialId ?? null;
    const backMat = materials.find((m) =>
      backId
        ? String(m.id) === String(backId)
        : m.categories.some(
            (c) =>
              c.toLowerCase().includes("leđa") ||
              c.toLowerCase().includes("ledja"),
          ),
    );
    const backPricePerM2 = Number(backMat?.price ?? 0);
    const actualBackT = (Number(backMat?.thickness ?? 5) / 1000) as number;

    // Convert dimensions to meters
    const w = snapshot.width / 100;
    const h = snapshot.height / 100;
    const d = snapshot.depth / 100;

    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(d) ||
      w <= 0 ||
      h <= 0 ||
      d <= 0
    ) {
      return emptyCutList;
    }

    // Carcass depth (shortened for back panel)
    const carcassD = d - backT;

    // Use actual vertical boundaries from store
    const verticalBoundaries = snapshot.verticalBoundaries ?? [];
    const columnHorizontalBoundaries =
      snapshot.columnHorizontalBoundaries ?? {};

    // Build columns using actual boundaries
    const columns = buildBlocksX(
      w,
      verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
    );
    const numColumns = columns.length;

    // Check if we need module split (h > 200cm)
    const needsModuleSplit = h > TARGET_BOTTOM_HEIGHT;
    let bottomModuleH = h;
    let topModuleH = 0;
    if (needsModuleSplit) {
      bottomModuleH =
        h - TARGET_BOTTOM_HEIGHT < MIN_TOP_HEIGHT
          ? h - MIN_TOP_HEIGHT
          : TARGET_BOTTOM_HEIGHT;
      topModuleH = h - bottomModuleH;
    }

    const items: CutListItem[] = [];

    // Helper to add korpus item
    const addKorpus = (
      code: string,
      desc: string,
      widthM: number,
      heightM: number,
      element: string,
    ) => {
      const area = widthM * heightM;
      items.push({
        code,
        desc,
        widthCm: widthM * 100,
        heightCm: heightM * 100,
        thicknessMm: t * 1000,
        areaM2: area,
        cost: area * pricePerM2,
        element,
        materialType: "korpus",
      });
    };

    // Helper to add front item
    const addFront = (
      code: string,
      desc: string,
      widthM: number,
      heightM: number,
      element: string,
    ) => {
      const area = widthM * heightM;
      items.push({
        code,
        desc,
        widthCm: widthM * 100,
        heightCm: heightM * 100,
        thicknessMm: frontT * 1000,
        areaM2: area,
        cost: area * frontPricePerM2,
        element,
        materialType: "front",
      });
    };

    // Helper to add back item
    const addBack = (
      code: string,
      desc: string,
      widthM: number,
      heightM: number,
      element: string,
    ) => {
      const area = widthM * heightM;
      items.push({
        code,
        desc,
        widthCm: widthM * 100,
        heightCm: heightM * 100,
        thicknessMm: actualBackT * 1000,
        areaM2: area,
        cost: area * backPricePerM2,
        element,
        materialType: "back",
      });
    };

    // Helper to add front item with custom material (for per-door materials)
    const addFrontWithMaterial = (
      code: string,
      desc: string,
      widthM: number,
      heightM: number,
      element: string,
      customMaterialId?: number,
    ) => {
      const area = widthM * heightM;
      // Use custom material if provided, otherwise fall back to global front material
      let priceToUse = frontPricePerM2;
      let thicknessToUse = frontT;

      if (customMaterialId !== undefined) {
        const customMat = materials.find(
          (m) => String(m.id) === String(customMaterialId),
        );
        if (customMat) {
          priceToUse = Number(customMat.price ?? frontPricePerM2);
          thicknessToUse = (Number(customMat.thickness ?? 18) / 1000) as number;
        }
      }

      items.push({
        code,
        desc,
        widthCm: widthM * 100,
        heightCm: heightM * 100,
        thicknessMm: thicknessToUse * 1000,
        areaM2: area,
        cost: area * priceToUse,
        element,
        materialType: "front",
      });
    };

    // Helper to get handle price from handles.json
    const getHandlePrice = (handleId: string, finishId: string): number => {
      const handle = handlesData.handles.find((h) => h.id === handleId);
      if (!handle) return 0;
      const finish = handle.finishes.find((f) => f.id === finishId);
      return finish?.price ?? 0;
    };

    // Track handles for pricing
    const handleItems: {
      handleId: string;
      finishId: string;
      count: number;
      price: number;
      element: string;
    }[] = [];

    // ==========================================
    // 1. OUTER SIDE PANELS (2 for entire wardrobe)
    // ==========================================
    // Side L and Side R - full height, carcass depth
    addKorpus("SL", "Leva stranica (spoljna)", carcassD, h, "KORPUS");
    addKorpus("SD", "Desna stranica (spoljna)", carcassD, h, "KORPUS");

    // ==========================================
    // 2. VERTICAL SEAM PANELS (2 per seam)
    // ==========================================
    // At each vertical boundary, there are 2 panels (one from each adjacent column)
    const seamH = hasBase ? h - baseH : h;
    verticalBoundaries.forEach((_, seamIdx) => {
      addKorpus(
        `VS${seamIdx + 1}L`,
        `Vertikalna pregrada ${seamIdx + 1} (leva)`,
        carcassD,
        seamH,
        "KORPUS",
      );
      addKorpus(
        `VS${seamIdx + 1}D`,
        `Vertikalna pregrada ${seamIdx + 1} (desna)`,
        carcassD,
        seamH,
        "KORPUS",
      );
    });

    // ==========================================
    // 3. TOP AND BOTTOM PANELS (per column)
    // ==========================================
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const innerW = Math.max(col.width - 2 * t, 0);

      if (innerW > 0) {
        // Bottom panel (raised by base if hasBase)
        addKorpus(
          `${colLetter}-DON`,
          `Donja ploča kolone ${colLetter}`,
          innerW,
          carcassD,
          colLetter,
        );

        // Top panel
        addKorpus(
          `${colLetter}-GOR`,
          `Gornja ploča kolone ${colLetter}`,
          innerW,
          carcassD,
          colLetter,
        );

        // Module boundary panels (if h > 200cm) - 2 panels touching
        if (needsModuleSplit) {
          addKorpus(
            `${colLetter}-MB1`,
            `Granica modula ${colLetter} (donja)`,
            innerW,
            carcassD,
            colLetter,
          );
          addKorpus(
            `${colLetter}-MB2`,
            `Granica modula ${colLetter} (gornja)`,
            innerW,
            carcassD,
            colLetter,
          );
        }
      }
    });

    // ==========================================
    // 4. MAIN SHELVES (from columnHorizontalBoundaries)
    // ==========================================
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const innerW = Math.max(col.width - 2 * t, 0);
      const shelfYs = columnHorizontalBoundaries[colIdx] || [];

      shelfYs.forEach((_, shelfIdx) => {
        if (innerW > 0) {
          addKorpus(
            `${colLetter}-P${shelfIdx + 1}`,
            `Polica ${colLetter} (glavna ${shelfIdx + 1})`,
            innerW,
            carcassD,
            colLetter,
          );
        }
      });
    });

    // ==========================================
    // 5. PER-COMPARTMENT: Inner structure, doors, drawers, back panels
    // ==========================================
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const innerW = Math.max(col.width - 2 * t, 0);
      const shelfYs = columnHorizontalBoundaries[colIdx] || [];
      const numCompartments = shelfYs.length + 1;

      // Calculate compartment heights
      const yBottom = -h / 2 + t + (hasBase ? baseH : 0);
      const yTop = h / 2 - t;
      const sortedYs = [...shelfYs].sort((a, b) => a - b);
      const allYs = [yBottom, ...sortedYs, yTop];

      for (let compIdx = 0; compIdx < numCompartments; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        const compYStart = allYs[compIdx];
        const compYEnd = allYs[compIdx + 1];
        const compH = Math.max(compYEnd - compYStart - t, 0); // Account for shelf thickness

        // Get element config for this compartment
        const cfg = elementConfigs[compKey] ?? { columns: 1, rowCounts: [0] };
        const innerCols = Math.max(1, (cfg.columns as number) | 0);

        // Calculate inner section widths
        const sectionW = innerW / innerCols;

        // Inner vertical dividers (from elementConfigs)
        if (innerCols > 1) {
          for (let divIdx = 1; divIdx < innerCols; divIdx++) {
            addKorpus(
              `${compKey}-VD${divIdx}`,
              `Vertikalni divider ${compKey} (${divIdx})`,
              carcassD,
              compH,
              compKey,
            );
          }
        }

        // Inner shelves per section (from rowCounts)
        for (let secIdx = 0; secIdx < innerCols; secIdx++) {
          const shelfCount = Math.max(
            0,
            Math.floor((cfg.rowCounts as number[] | undefined)?.[secIdx] ?? 0),
          );
          const secW = Math.max(sectionW - (innerCols > 1 ? t : 0), 0);

          for (let shelfNum = 0; shelfNum < shelfCount; shelfNum++) {
            addKorpus(
              `${compKey}-S${secIdx + 1}P${shelfNum + 1}`,
              `Polica ${compKey} sekcija ${secIdx + 1} (${shelfNum + 1})`,
              secW,
              carcassD,
              compKey,
            );
          }
        }

        // Extras: center vertical divider
        const extras = compartmentExtras[compKey] ?? {};
        if (extras.verticalDivider && innerCols === 1) {
          addKorpus(
            `${compKey}-VDC`,
            `Vertikalni divider (srednji) ${compKey}`,
            carcassD,
            compH,
            compKey,
          );
        }

        // Drawers (use front material)
        if (extras.drawers) {
          const drawerH = DRAWER_HEIGHT;
          const gap = DRAWER_GAP;
          const per = drawerH + gap;
          const maxDrawers = Math.max(0, Math.floor((compH + gap) / per));
          const countFromState = Math.max(
            0,
            Math.floor(extras.drawersCount ?? 0),
          );
          const usedCount =
            countFromState > 0
              ? Math.min(countFromState, maxDrawers)
              : maxDrawers;

          for (let drwIdx = 0; drwIdx < usedCount; drwIdx++) {
            addFront(
              `${compKey}-F${drwIdx + 1}`,
              `Fioka ${compKey} (${drwIdx + 1})`,
              innerW,
              drawerH,
              compKey,
            );
          }

          // Auto-shelf above drawers if space remains
          if (usedCount > 0 && usedCount < maxDrawers) {
            const drawersTopY = usedCount * per;
            const remaining = compH - drawersTopY;
            if (remaining >= t) {
              addKorpus(
                `${compKey}-PA`,
                `Polica iznad fioka ${compKey}`,
                innerW,
                carcassD,
                compKey,
              );
            }
          }
        }

        // Doors - check doorGroups first (new system), fall back to doorSelections (legacy)
        // Find if this compartment is part of a door group
        const doorGroup = doorGroups.find((g) =>
          g.compartments.includes(compKey),
        );

        if (doorGroup) {
          // Use new doorGroups system - only process if this is the FIRST compartment in the group
          // This prevents adding the door multiple times for multi-compartment groups
          if (doorGroup.compartments[0] === compKey) {
            const doorType = doorGroup.type;
            if (doorType && doorType !== "none") {
              const doorW = Math.max(col.width - 1 / 1000, 0); // 1mm clearance

              // Calculate total door height for multi-compartment groups
              let totalDoorH = compH;
              if (doorGroup.compartments.length > 1) {
                // Sum heights of all compartments in the group
                totalDoorH = doorGroup.compartments.reduce((sum, cKey) => {
                  // Find this compartment's index and calculate its height
                  const compMatch = cKey.match(/^([A-Z]+)(\d+)/);
                  if (compMatch) {
                    const cIdx = parseInt(compMatch[2]) - 1;
                    if (cIdx >= 0 && cIdx < numCompartments) {
                      const cYStart = allYs[cIdx];
                      const cYEnd = allYs[cIdx + 1];
                      return sum + Math.max(cYEnd - cYStart - t, 0);
                    }
                  }
                  return sum;
                }, 0);
              }

              // Get per-door material if in per-door mode
              const doorMaterialId =
                doorSettingsMode === "per-door" &&
                doorGroup.materialId !== undefined
                  ? doorGroup.materialId
                  : undefined;

              // Get handle info for this door
              const doorHandleId =
                doorSettingsMode === "per-door" && doorGroup.handleId
                  ? doorGroup.handleId
                  : globalHandleId;
              const doorHandleFinish =
                doorSettingsMode === "per-door" && doorGroup.handleFinish
                  ? doorGroup.handleFinish
                  : globalHandleFinish;

              const groupId = doorGroup.id;

              if (doorType === "double" || doorType === "doubleMirror") {
                const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
                addFrontWithMaterial(
                  `${groupId}-VL`,
                  `Vrata leva ${doorGroup.compartments.join("+")}`,
                  leafW,
                  totalDoorH,
                  compKey,
                  doorMaterialId,
                );
                addFrontWithMaterial(
                  `${groupId}-VD`,
                  `Vrata desna ${doorGroup.compartments.join("+")}`,
                  leafW,
                  totalDoorH,
                  compKey,
                  doorMaterialId,
                );
                // Add 2 handles for double doors
                const handlePrice = getHandlePrice(
                  doorHandleId,
                  doorHandleFinish,
                );
                if (handlePrice > 0) {
                  handleItems.push({
                    handleId: doorHandleId,
                    finishId: doorHandleFinish,
                    count: 2,
                    price: handlePrice * 2,
                    element: groupId,
                  });
                }
              } else if (doorType === "drawerStyle") {
                // Drawer-style door - no handle (push-to-open)
                addFrontWithMaterial(
                  `${groupId}-V`,
                  `Vrata (fioka stil) ${doorGroup.compartments.join("+")}`,
                  doorW,
                  totalDoorH,
                  compKey,
                  doorMaterialId,
                );
              } else {
                // Single door (left, right, leftMirror, rightMirror)
                addFrontWithMaterial(
                  `${groupId}-V`,
                  `Vrata ${doorGroup.compartments.join("+")}`,
                  doorW,
                  totalDoorH,
                  compKey,
                  doorMaterialId,
                );
                // Add 1 handle for single door
                const handlePrice = getHandlePrice(
                  doorHandleId,
                  doorHandleFinish,
                );
                if (handlePrice > 0) {
                  handleItems.push({
                    handleId: doorHandleId,
                    finishId: doorHandleFinish,
                    count: 1,
                    price: handlePrice,
                    element: groupId,
                  });
                }
              }
            }
          }
          // Skip if not first compartment - door already added
        } else {
          // Legacy doorSelections system (for backward compatibility)
          const doorSel = doorSelections[compKey];
          if (doorSel && doorSel !== "none") {
            const doorW = Math.max(col.width - 1 / 1000, 0); // 1mm clearance
            const doorH = compH;

            // Get handle price using global settings (legacy mode)
            const handlePrice = getHandlePrice(
              globalHandleId,
              globalHandleFinish,
            );

            if (doorSel === "double" || doorSel === "doubleMirror") {
              const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
              addFront(
                `${compKey}-VL`,
                `Vrata leva ${compKey}`,
                leafW,
                doorH,
                compKey,
              );
              addFront(
                `${compKey}-VD`,
                `Vrata desna ${compKey}`,
                leafW,
                doorH,
                compKey,
              );
              // Add 2 handles for double doors
              if (handlePrice > 0) {
                handleItems.push({
                  handleId: globalHandleId,
                  finishId: globalHandleFinish,
                  count: 2,
                  price: handlePrice * 2,
                  element: compKey,
                });
              }
            } else if (doorSel === "drawerStyle") {
              // Drawer-style door - no handle
              addFront(
                `${compKey}-V`,
                `Vrata (fioka stil) ${compKey}`,
                doorW,
                doorH,
                compKey,
              );
            } else {
              addFront(
                `${compKey}-V`,
                `Vrata ${compKey}`,
                doorW,
                doorH,
                compKey,
              );
              // Add 1 handle for single door
              if (handlePrice > 0) {
                handleItems.push({
                  handleId: globalHandleId,
                  finishId: globalHandleFinish,
                  count: 1,
                  price: handlePrice,
                  element: compKey,
                });
              }
            }
          }
        }

        // Back panel per compartment (use back material)
        const backClearance = 2 / 1000; // 2mm
        const backW = Math.max(col.width - backClearance, 0);
        const backH = Math.max(compH - backClearance, 0);
        if (backW > 0 && backH > 0) {
          addBack(
            `${compKey}-Z`,
            `Zadnji panel ${compKey}`,
            backW,
            backH,
            compKey,
          );
        }
      }
    });

    // ==========================================
    // Calculate totals
    // ==========================================
    const totalArea = items.reduce((a, b) => a + b.areaM2, 0);
    const materialCost = items.reduce((a, b) => a + b.cost, 0);

    // Calculate handle totals
    const totalHandleCount = handleItems.reduce((sum, h) => sum + h.count, 0);
    const totalHandlePrice = handleItems.reduce((sum, h) => sum + h.price, 0);

    // Add handle items to the cut list for transparency
    handleItems.forEach((h) => {
      const handle = handlesData.handles.find((hd) => hd.id === h.handleId);
      const finish = handle?.finishes.find((f) => f.id === h.finishId);
      items.push({
        code: `H-${h.handleId}-${h.finishId}`,
        desc: `${handle?.name ?? "Ručka"} - ${finish?.name ?? h.finishId} (${h.count}x)`,
        widthCm: 0,
        heightCm: 0,
        thicknessMm: 0,
        areaM2: 0,
        cost: h.price,
        element: h.element,
        materialType: "handles",
      });
    });

    // Total cost includes materials + handles
    const totalCost = materialCost + totalHandlePrice;

    // Group by element
    const grouped = items.reduce((acc: Record<string, CutListItem[]>, it) => {
      (acc[it.element] = acc[it.element] || []).push(it);
      return acc;
    }, {});

    // Price breakdown by material type
    const priceBreakdown: PriceBreakdown = {
      korpus: {
        areaM2: items
          .filter((it) => it.materialType === "korpus")
          .reduce((sum, it) => sum + it.areaM2, 0),
        price: Math.round(
          items
            .filter((it) => it.materialType === "korpus")
            .reduce((sum, it) => sum + it.cost, 0),
        ),
      },
      front: {
        areaM2: items
          .filter((it) => it.materialType === "front")
          .reduce((sum, it) => sum + it.areaM2, 0),
        price: Math.round(
          items
            .filter((it) => it.materialType === "front")
            .reduce((sum, it) => sum + it.cost, 0),
        ),
      },
      back: {
        areaM2: items
          .filter((it) => it.materialType === "back")
          .reduce((sum, it) => sum + it.areaM2, 0),
        price: Math.round(
          items
            .filter((it) => it.materialType === "back")
            .reduce((sum, it) => sum + it.cost, 0),
        ),
      },
      handles: {
        count: totalHandleCount,
        price: Math.round(totalHandlePrice),
      },
    };

    return { items, grouped, totalArea, totalCost, pricePerM2, priceBreakdown };
  } catch {
    return emptyCutList;
  }
}
