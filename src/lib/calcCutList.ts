import { parseSubCompKey, type DoorOption } from "@/lib/store";
import {
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
  DRAWER_HEIGHT,
  DRAWER_GAP,
} from "./wardrobe-constants";
import { buildBlocksX } from "./wardrobe-utils";

// Handle types for pricing (from database)
type PricingHandleFinish = {
  id: number;
  legacyId: string | null;
  name: string;
  price: number; // Selling price in RSD
};

type PricingHandle = {
  id: number;
  legacyId: string | null;
  name: string;
  finishes: PricingHandleFinish[];
};

type PricingMaterial = {
  id: number;
  price: number;
  thickness: number | null;
  categories: string[];
};

type ElementConfig = {
  columns: number;
  rowCounts: number[];
  drawerCounts?: number[];
  drawersExternal?: boolean[];
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
  columnTopModuleShelves?: Record<number, number[]>; // Y positions of shelves in top module per column
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
  handles: PricingHandle[] = [],
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
    // Module boundaries for wardrobes > 200cm (top/bottom module split)
    const columnModuleBoundaries = snapshot.columnModuleBoundaries ?? {};
    const columnTopModuleShelves = snapshot.columnTopModuleShelves ?? {};

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

    // Helper to get handle price from handles array (database)
    const getHandlePrice = (handleId: string, finishId: string): number => {
      // Find handle by legacyId first (for backward compatibility), then by id
      const handle = handles.find(
        (h) => h.legacyId === handleId || String(h.id) === handleId,
      );
      if (!handle) return 0;
      // Find finish by legacyId first, then by id
      const finish = handle.finishes.find(
        (f) => f.legacyId === finishId || String(f.id) === finishId,
      );
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
    const seamH = h; // Seams go full height to floor (through base area)
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

        // Base front panel (sokl) - one per column
        if (hasBase && baseH > 0) {
          addKorpus(
            `${colLetter}-SOKL`,
            `Sokl kolone ${colLetter}`,
            innerW,
            baseH,
            colLetter,
          );
        }

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
    // 4b. TOP MODULE SHELVES (from columnTopModuleShelves)
    // ==========================================
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const innerW = Math.max(col.width - 2 * t, 0);

      const storeModuleBoundary = columnModuleBoundaries[colIdx];
      const hasModuleBound =
        storeModuleBoundary !== undefined && storeModuleBoundary !== null;
      if (!hasModuleBound && !needsModuleSplit) return;

      const topShelfYs = columnTopModuleShelves[colIdx] || [];
      topShelfYs.forEach((_, shelfIdx) => {
        if (innerW > 0) {
          addKorpus(
            `${colLetter}-TP${shelfIdx + 1}`,
            `Polica ${colLetter} gornji modul (${shelfIdx + 1})`,
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
    // Helper function to process a single compartment (used for both bottom and top modules)
    const processCompartment = (
      colLetter: string,
      colIdx: number,
      compKey: string,
      compH: number,
      innerW: number,
      col: { start: number; end: number; width: number },
      allYs: number[],
      numCompartments: number,
    ) => {
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

      // Drawers (use front material) - from elementConfigs.drawerCounts per section
      for (let secIdx = 0; secIdx < innerCols; secIdx++) {
        const drawerCount = Math.max(
          0,
          Math.floor(cfg.drawerCounts?.[secIdx] ?? 0),
        );
        if (drawerCount <= 0) continue;

        const secW = Math.max(sectionW - (innerCols > 1 ? t : 0), 0);
        const drawerH = DRAWER_HEIGHT;
        const gap = DRAWER_GAP;
        const per = drawerH + gap;
        const maxDrawers = Math.max(0, Math.floor((compH + gap) / per));
        const usedCount = Math.min(drawerCount, maxDrawers);

        for (let drwIdx = 0; drwIdx < usedCount; drwIdx++) {
          const code =
            innerCols > 1
              ? `${compKey}-S${secIdx + 1}F${drwIdx + 1}`
              : `${compKey}-F${drwIdx + 1}`;
          const desc =
            innerCols > 1
              ? `Fioka ${compKey} sek.${secIdx + 1} (${drwIdx + 1})`
              : `Fioka ${compKey} (${drwIdx + 1})`;
          addFront(code, desc, secW, drawerH, compKey);
        }

        // Auto-shelf above drawers if space remains
        if (usedCount > 0 && usedCount < maxDrawers) {
          const drawersTopY = usedCount * per;
          const remaining = compH - drawersTopY;
          if (remaining >= t) {
            const shelfCode =
              innerCols > 1 ? `${compKey}-S${secIdx + 1}PA` : `${compKey}-PA`;
            addKorpus(
              shelfCode,
              `Polica iznad fioka ${compKey}`,
              secW,
              carcassD,
              compKey,
            );
          }
        }
      }

      // Doors - check doorGroups first (new system), fall back to doorSelections (legacy)
      // Find if this compartment is part of a door group
      // Check both exact match and base key (strip sub-indices)
      const doorGroup = doorGroups.find((g) =>
        g.compartments.some((gCompKey) => {
          // Direct match
          if (gCompKey === compKey) return true;
          // Check if group uses sub-key that belongs to this compartment
          const parsed = parseSubCompKey(gCompKey);
          return parsed && parsed.compKey === compKey;
        }),
      );

      if (doorGroup) {
        // Use new doorGroups system - only process if this is the FIRST compartment in the group
        // This prevents adding the door multiple times for multi-compartment groups
        const firstCompKey = doorGroup.compartments[0];
        const firstParsed = parseSubCompKey(firstCompKey);
        const isFirstComp = firstParsed
          ? firstParsed.compKey === compKey
          : firstCompKey === compKey;

        if (isFirstComp) {
          const doorType = doorGroup.type;
          if (doorType && doorType !== "none") {
            const doorW = Math.max(col.width - 1 / 1000, 0); // 1mm clearance

            // Calculate total door height for multi-compartment groups
            let totalDoorH = compH;
            if (doorGroup.compartments.length > 1) {
              // Check if all compartments share the same base key (all sub-compartments of current compartment)
              const allSameBase = doorGroup.compartments.every((cKey) => {
                const parsed = parseSubCompKey(cKey);
                return parsed && parsed.compKey === compKey;
              });

              if (allSameBase) {
                // All sub-compartments of the current base compartment
                // Door spans the entire base compartment, so use compH
                totalDoorH = compH;
              } else {
                // Multiple different base compartments - sum unique heights
                const uniqueBaseKeys = new Set<string>();
                totalDoorH = doorGroup.compartments.reduce((sum, cKey) => {
                  const parsed = parseSubCompKey(cKey);
                  const baseKey = parsed ? parsed.compKey : cKey;

                  // Only add height once per unique base key
                  if (uniqueBaseKeys.has(baseKey)) {
                    return sum;
                  }
                  uniqueBaseKeys.add(baseKey);

                  const compMatch = baseKey.match(/^([A-Z]+)(\d+)/);
                  if (compMatch) {
                    const cIdx = parseInt(compMatch[2]) - 1;
                    if (
                      cIdx >= 0 &&
                      cIdx < numCompartments &&
                      allYs[cIdx] !== undefined &&
                      allYs[cIdx + 1] !== undefined
                    ) {
                      const cYStart = allYs[cIdx];
                      const cYEnd = allYs[cIdx + 1];
                      return sum + Math.max(cYEnd - cYStart - t, 0);
                    }
                  }
                  return sum;
                }, 0);
              }
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

            // Format compartment label - simplify sub-compartments to base key
            const uniqueBaseKeys = new Set<string>();
            doorGroup.compartments.forEach((cKey) => {
              const parsed = parseSubCompKey(cKey);
              uniqueBaseKeys.add(parsed ? parsed.compKey : cKey);
            });
            const compartmentLabel = Array.from(uniqueBaseKeys).join("+");

            // Human-readable door type names
            const getDoorTypeLabel = (type: string): string => {
              switch (type) {
                case "left":
                  return "leva";
                case "right":
                  return "desna";
                case "double":
                  return "dvokrilna";
                case "leftMirror":
                  return "leva sa ogledalom";
                case "rightMirror":
                  return "desna sa ogledalom";
                case "doubleMirror":
                  return "dvokrilna sa ogledalom";
                case "drawerStyle":
                  return "fioka stil";
                default:
                  return type;
              }
            };
            const doorTypeLabel = getDoorTypeLabel(doorType);

            if (doorType === "double" || doorType === "doubleMirror") {
              const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
              const isMirror = doorType === "doubleMirror";
              addFrontWithMaterial(
                `${compKey}-VL`,
                `Vrata ${compartmentLabel} levo krilo${isMirror ? " (ogledalo)" : ""}`,
                leafW,
                totalDoorH,
                compKey,
                doorMaterialId,
              );
              addFrontWithMaterial(
                `${compKey}-VD`,
                `Vrata ${compartmentLabel} desno krilo${isMirror ? " (ogledalo)" : ""}`,
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
                  element: compKey,
                });
              }
            } else if (doorType === "drawerStyle") {
              // Drawer-style door - no handle (push-to-open)
              addFrontWithMaterial(
                `${compKey}-V`,
                `Vrata ${compartmentLabel} (${doorTypeLabel})`,
                doorW,
                totalDoorH,
                compKey,
                doorMaterialId,
              );
            } else {
              // Single door (left, right, leftMirror, rightMirror)
              const isMirror =
                doorType === "leftMirror" || doorType === "rightMirror";
              addFrontWithMaterial(
                `${compKey}-V`,
                `Vrata ${compartmentLabel} (${doorTypeLabel})`,
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
                  element: compKey,
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

          // Human-readable door type for legacy
          const getLegacyDoorTypeLabel = (type: string): string => {
            switch (type) {
              case "left":
                return "leva";
              case "right":
                return "desna";
              case "double":
                return "dvokrilna";
              case "leftMirror":
                return "leva sa ogledalom";
              case "rightMirror":
                return "desna sa ogledalom";
              case "doubleMirror":
                return "dvokrilna sa ogledalom";
              case "drawerStyle":
                return "fioka stil";
              default:
                return type;
            }
          };

          if (doorSel === "double" || doorSel === "doubleMirror") {
            const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
            const isMirror = doorSel === "doubleMirror";
            addFront(
              `${compKey}-VL`,
              `Vrata ${compKey} levo krilo${isMirror ? " (ogledalo)" : ""}`,
              leafW,
              doorH,
              compKey,
            );
            addFront(
              `${compKey}-VD`,
              `Vrata ${compKey} desno krilo${isMirror ? " (ogledalo)" : ""}`,
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
              `Vrata ${compKey} (fioka stil)`,
              doorW,
              doorH,
              compKey,
            );
          } else {
            addFront(
              `${compKey}-V`,
              `Vrata ${compKey} (${getLegacyDoorTypeLabel(doorSel)})`,
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

      // Back panels are added per-module (not per-compartment) — see section 6 below
    };

    // Calculate module boundary Y position (used when store value not set)
    // This is the Y coordinate where modules split (in center-origin coordinates)
    const calculatedModuleBoundaryY = bottomModuleH;

    // Process all columns
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const innerW = Math.max(col.width - 2 * t, 0);

      // Check if this column has a module boundary (for wardrobes > 200cm)
      // Use store value if available, otherwise fall back to calculated position
      const storeModuleBoundary = columnModuleBoundaries[colIdx];
      const hasStoreModuleBoundary =
        storeModuleBoundary !== undefined && storeModuleBoundary !== null;

      // Use store value if set, otherwise use calculated value when needsModuleSplit
      const moduleBoundary = hasStoreModuleBoundary
        ? storeModuleBoundary
        : needsModuleSplit
          ? calculatedModuleBoundaryY
          : null;
      const hasModuleSplit = moduleBoundary !== null;

      // ============================================
      // BOTTOM MODULE COMPARTMENTS
      // ============================================
      const bottomShelfYs = columnHorizontalBoundaries[colIdx] || [];

      // Bottom module bounds
      const bottomYStart = t + (hasBase ? baseH : 0);
      const bottomYEnd = hasModuleSplit
        ? moduleBoundary - t // Module boundary minus panel thickness
        : h - t; // Full height if no split (floor-origin)

      // Filter shelves to valid range (stale positions can be outside bounds)
      const bottomSortedYs = [...bottomShelfYs]
        .filter((y) => y > bottomYStart && y < bottomYEnd)
        .sort((a, b) => a - b);
      const bottomNumComps = bottomSortedYs.length + 1;
      const bottomAllYs = [bottomYStart, ...bottomSortedYs, bottomYEnd];

      for (let compIdx = 0; compIdx < bottomNumComps; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        const compYStart = bottomAllYs[compIdx];
        const compYEnd = bottomAllYs[compIdx + 1];
        // Edge boundaries are panel surfaces; shelf boundaries are shelf centers
        // Only subtract t/2 per shelf-center boundary (not for panel-surface boundaries)
        const isFirst = compIdx === 0;
        const isLast = compIdx === bottomNumComps - 1;
        let shelfDeduction = 0;
        if (!isFirst) shelfDeduction += t / 2; // bottom boundary is shelf center
        if (!isLast) shelfDeduction += t / 2; // top boundary is shelf center
        const compH = Math.max(compYEnd - compYStart - shelfDeduction, 0);

        processCompartment(
          colLetter,
          colIdx,
          compKey,
          compH,
          innerW,
          col,
          bottomAllYs,
          bottomNumComps,
        );
      }

      // ============================================
      // TOP MODULE COMPARTMENTS (if module split exists)
      // ============================================
      if (hasModuleSplit) {
        const topShelfYs = columnTopModuleShelves[colIdx] || [];

        // Top module bounds
        const topYStart = moduleBoundary + t; // After module boundary panel
        const topYEnd = h - t; // Wardrobe top (floor-origin)

        // Filter shelves to valid range (stale positions can be outside bounds)
        const topSortedYs = [...topShelfYs]
          .filter((y) => y > topYStart && y < topYEnd)
          .sort((a, b) => a - b);
        const topNumComps = topSortedYs.length + 1;
        const topAllYs = [topYStart, ...topSortedYs, topYEnd];

        for (let compIdx = 0; compIdx < topNumComps; compIdx++) {
          // Top module compartments continue numbering (e.g., A2, A3, etc.)
          const compKey = `${colLetter}${bottomNumComps + compIdx + 1}`;
          const compYStart = topAllYs[compIdx];
          const compYEnd = topAllYs[compIdx + 1];
          // Same shelf-deduction logic as bottom module
          const isFirst = compIdx === 0;
          const isLast = compIdx === topNumComps - 1;
          let shelfDeduction = 0;
          if (!isFirst) shelfDeduction += t / 2;
          if (!isLast) shelfDeduction += t / 2;
          const compH = Math.max(compYEnd - compYStart - shelfDeduction, 0);

          processCompartment(
            colLetter,
            colIdx,
            compKey,
            compH,
            innerW,
            col,
            topAllYs,
            topNumComps,
          );
        }
      }
    });

    // ==========================================
    // 6. BACK PANELS — one per module per column
    // ==========================================
    const backClearance = 2 / 1000; // 2mm clearance
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const backW = Math.max(col.width - backClearance, 0);

      const storeModBound = columnModuleBoundaries[colIdx];
      const hasModBound = storeModBound !== undefined && storeModBound !== null;
      const hasModuleSplit =
        (hasModBound || needsModuleSplit) && h > TARGET_BOTTOM_HEIGHT;

      const modBoundY = hasModBound
        ? storeModBound
        : needsModuleSplit
          ? calculatedModuleBoundaryY
          : null;

      if (hasModuleSplit && modBoundY != null) {
        // Two modules: bottom + top
        const bottomH = Math.max(
          modBoundY - (hasBase ? baseH : 0) - backClearance,
          0,
        );
        const topH = Math.max(h - modBoundY - backClearance, 0);

        if (backW > 0 && bottomH > 0) {
          addBack(
            `${colLetter}-ZD`,
            `Zadnja strana ${colLetter} donji modul`,
            backW,
            bottomH,
            colLetter,
          );
        }
        if (backW > 0 && topH > 0) {
          addBack(
            `${colLetter}-ZG`,
            `Zadnja strana ${colLetter} gornji modul`,
            backW,
            topH,
            colLetter,
          );
        }
      } else {
        // Single module: one back panel
        const backH = Math.max(h - (hasBase ? baseH : 0) - backClearance, 0);
        if (backW > 0 && backH > 0) {
          addBack(
            `${colLetter}-Z`,
            `Zadnja strana ${colLetter}`,
            backW,
            backH,
            colLetter,
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
      const handle = handles.find(
        (hd) => hd.legacyId === h.handleId || String(hd.id) === h.handleId,
      );
      const finish = handle?.finishes.find(
        (f) => f.legacyId === h.finishId || String(f.id) === h.finishId,
      );
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
