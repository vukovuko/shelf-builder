import { parseSubCompKey, type DoorOption } from "@/lib/store";
import {
  evaluateNumericFormula,
  matchesAccessoryRuleConditions,
  type AccessoryRule,
} from "@/lib/accessory-rules";
import {
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
  SLIDING_DOOR_OVERLAP_M,
} from "./wardrobe-constants";
import { buildBlocksX } from "./wardrobe-utils";
import { computeCompartmentCount } from "./rules/computeCompartmentCount";
import { computeDoorMetrics } from "./rules/computeDoorMetrics";
import { computeShelfCount } from "./rules/computeShelfCount";

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
  name?: string;
  price: number;
  thickness: number | null;
  categories: string[];
};

type AccessoryRuleTargetContext = {
  id: string;
  element: string;
  label: string;
  width: number;
  height: number;
  depth: number;
  area: number;
  index: number;
  columnIndex: number;
  elementInnerWidth?: number;
  outerWidth?: number;
  outerHeight?: number;
};

type AccessoryRuleInput = {
  id: string;
  name: string;
  enabled: boolean;
  target: string;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string | number | boolean | string[] | number[];
    logicOperator?: "AND" | "OR";
  }>;
  config: {
    itemName: string;
    codePrefix?: string;
    materialType?: "korpus" | "front" | "back";
    widthFormula: string;
    heightFormula: string;
    thicknessFormula?: string;
    quantity?: number | string;
  };
};

// Accessory types for pricing
type PricingAccessoryVariant = {
  id: number;
  price: number;
};

type PricingAccessory = {
  id: number;
  name: string;
  pricingRule: "none" | "perDrawer" | "perDoor" | "fixed";
  qtyPerUnit: number;
  variants: PricingAccessoryVariant[];
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
  columnHeights?: Record<number, number>; // Column heights in cm
  columnModuleBoundaries?: Record<number, number | null>; // Module split Y position per column
  columnTopModuleShelves?: Record<number, number[]>; // Y positions of shelves in top module per column
  // Door groups with per-door settings
  doorGroups?: DoorGroup[];
  // Global handle settings
  globalHandleId?: string;
  globalHandleFinish?: string;
  // Door settings mode
  doorSettingsMode?: "global" | "per-door";
  // Accessory selections (accessoryId → variantId)
  selectedAccessories?: Record<number, number | null>;
  // Sliding doors (klizeća vrata)
  slidingDoors?: boolean;
};

export type MaterialType =
  | "korpus"
  | "front"
  | "back"
  | "handles"
  | "accessories";

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
  accessories: { count: number; price: number };
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
    accessories: { count: 0, price: 0 },
  },
};

export function countBoardsExcludingShelvesAndBacks(
  items: CutListItem[],
): number {
  return items.filter((item) => {
    if (item.materialType !== "korpus" && item.materialType !== "front") {
      return false;
    }

    return !/^polica\b/i.test(item.desc.trim());
  }).length;
}

const TOP_MODULE_ELEMENT_SUFFIX = "1";

export function getTopModuleElementKey(columnKey: string): string {
  return `${columnKey}${TOP_MODULE_ELEMENT_SUFFIX}`;
}

export function parseCutListElementKey(elementKey: string): {
  columnKey: string;
  isTopModule: boolean;
} | null {
  const match = elementKey.match(/^([A-Z]+)(1)?$/);
  if (!match) {
    return null;
  }

  return {
    columnKey: match[1],
    isTopModule: match[2] === TOP_MODULE_ELEMENT_SUFFIX,
  };
}

export function getCutListGroupKey(element: string): string {
  if (!element) {
    return "OSTALO";
  }

  const directElement = parseCutListElementKey(element);
  if (directElement) {
    return directElement.isTopModule
      ? getTopModuleElementKey(directElement.columnKey)
      : directElement.columnKey;
  }

  const slidingDoorMatch = element.match(/^KV-([A-Z]+)$/);
  if (slidingDoorMatch) {
    return slidingDoorMatch[1];
  }

  const normalizedElement = parseSubCompKey(element)?.compKey ?? element;
  const compartmentMatch = normalizedElement.match(/^([A-Z]+)\d+$/);
  if (compartmentMatch) {
    return compartmentMatch[1];
  }

  if (/^[A-Z]+$/.test(normalizedElement)) {
    return normalizedElement;
  }

  return element;
}

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
  accessories: PricingAccessory[] = [],
  accessoryRules: AccessoryRuleInput[] = [],
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
    const slidingDoors = snapshot.slidingDoors ?? false;

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
    const columnHeights = snapshot.columnHeights ?? {};
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
    const elementTargets: AccessoryRuleTargetContext[] = [];
    const doorTargets: AccessoryRuleTargetContext[] = [];
    const drawerTargets: AccessoryRuleTargetContext[] = [];
    const shelfTargets: AccessoryRuleTargetContext[] = [];
    const slidingDoorTargets: AccessoryRuleTargetContext[] = [];

    // Running counters for accessory pricing
    let totalDrawerCount = 0;
    let totalDoorLeaves = 0;

    const getColumnHeightM = (colIdx: number): number => {
      const colHeightCm = columnHeights[colIdx] ?? snapshot.height;
      return colHeightCm / 100;
    };

    const getVerticalPanelSpans = (
      totalHeight: number,
      splitAt: number | null,
    ): Array<{ suffix: string; height: number; descSuffix: string }> => {
      if (
        totalHeight <= 0 ||
        splitAt === null ||
        splitAt <= 0 ||
        splitAt >= totalHeight
      ) {
        return [{ suffix: "", height: totalHeight, descSuffix: "" }];
      }

      return [
        { suffix: "D", height: splitAt, descSuffix: " donji modul" },
        {
          suffix: "G",
          height: totalHeight - splitAt,
          descSuffix: " gornji modul",
        },
      ].filter((span) => span.height > 0);
    };

    const getModuleElementKey = (columnKey: string, isTopModule: boolean) =>
      isTopModule ? getTopModuleElementKey(columnKey) : columnKey;

    const getSidePanelDescription = (
      side: "Leva" | "Desna",
      scope: string,
      moduleSuffix: string,
    ) => `${side} stranica ${scope}${moduleSuffix}`;

    const getElementScope = (elementKey: string) => `elementa ${elementKey}`;

    const getElementPanelDescription = (
      label: string,
      elementKey: string,
      moduleSuffix = "",
    ) => `${label} ${getElementScope(elementKey)}${moduleSuffix}`;

    const getIndexedElementDescription = (
      label: string,
      elementKey: string,
      index: number,
      moduleSuffix = "",
      extraPrefix = "",
    ) =>
      `${label} ${getElementScope(elementKey)}${moduleSuffix} ${extraPrefix}(${index})`.replace(
        /\s+/g,
        " ",
      );

    const toCm = (valueM: number) => valueM * 100;
    const toMm = (valueM: number) => valueM * 1000;
    const sanitizeCodePart = (value: string) => {
      const sanitized = value
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return sanitized || "X";
    };

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
    const firstColumnLetter = String.fromCharCode(65);
    const lastColumnLetter = String.fromCharCode(65 + numColumns - 1);
    const leftOuterHeight = getColumnHeightM(0);
    const leftOuterBoundary = columnModuleBoundaries[0] ?? null;
    getVerticalPanelSpans(
      leftOuterHeight,
      leftOuterHeight > TARGET_BOTTOM_HEIGHT ? leftOuterBoundary : null,
    ).forEach((span) => {
      const elementKey = getModuleElementKey(
        firstColumnLetter,
        span.suffix === "G",
      );
      addKorpus(
        `SL${span.suffix}`,
        getSidePanelDescription(
          "Leva",
          `${getElementScope(elementKey)} (spoljna)`,
          "",
        ),
        carcassD,
        span.height,
        elementKey,
      );
    });

    const rightOuterHeight = getColumnHeightM(numColumns - 1);
    const rightOuterBoundary = columnModuleBoundaries[numColumns - 1] ?? null;
    getVerticalPanelSpans(
      rightOuterHeight,
      rightOuterHeight > TARGET_BOTTOM_HEIGHT ? rightOuterBoundary : null,
    ).forEach((span) => {
      const elementKey = getModuleElementKey(
        lastColumnLetter,
        span.suffix === "G",
      );
      addKorpus(
        `SD${span.suffix}`,
        getSidePanelDescription(
          "Desna",
          `${getElementScope(elementKey)} (spoljna)`,
          "",
        ),
        carcassD,
        span.height,
        elementKey,
      );
    });

    // ==========================================
    // 2. VERTICAL SEAM PANELS (2 per seam)
    // ==========================================
    verticalBoundaries.forEach((_, seamIdx) => {
      const leftColumnLetter = String.fromCharCode(65 + seamIdx);
      const rightColumnLetter = String.fromCharCode(65 + seamIdx + 1);
      const leftSeamHeight = getColumnHeightM(seamIdx);
      const leftSeamBoundary = columnModuleBoundaries[seamIdx] ?? null;
      getVerticalPanelSpans(
        leftSeamHeight,
        leftSeamHeight > TARGET_BOTTOM_HEIGHT ? leftSeamBoundary : null,
      ).forEach((span) => {
        const elementKey = getModuleElementKey(
          leftColumnLetter,
          span.suffix === "G",
        );
        addKorpus(
          `VS${seamIdx + 1}L${span.suffix}`,
          getSidePanelDescription("Desna", getElementScope(elementKey), ""),
          carcassD,
          span.height,
          elementKey,
        );
      });

      const rightSeamHeight = getColumnHeightM(seamIdx + 1);
      const rightSeamBoundary = columnModuleBoundaries[seamIdx + 1] ?? null;
      getVerticalPanelSpans(
        rightSeamHeight,
        rightSeamHeight > TARGET_BOTTOM_HEIGHT ? rightSeamBoundary : null,
      ).forEach((span) => {
        const elementKey = getModuleElementKey(
          rightColumnLetter,
          span.suffix === "G",
        );
        addKorpus(
          `VS${seamIdx + 1}D${span.suffix}`,
          getSidePanelDescription("Leva", getElementScope(elementKey), ""),
          carcassD,
          span.height,
          elementKey,
        );
      });
    });

    // ==========================================
    // 3. TOP AND BOTTOM PANELS (per column)
    // ==========================================
    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const topElementKey = getTopModuleElementKey(colLetter);
      const innerW = Math.max(col.width - 2 * t, 0);

      if (innerW > 0) {
        // Bottom panel (raised by base if hasBase)
        addKorpus(
          `${colLetter}-DON`,
          getElementPanelDescription("Donja ploča", colLetter),
          innerW,
          carcassD,
          colLetter,
        );

        // Base front panel (sokl) - one per column
        if (hasBase && baseH > 0) {
          addKorpus(
            `${colLetter}-SOKL`,
            getElementPanelDescription("Sokl", colLetter),
            innerW,
            baseH,
            colLetter,
          );
        }

        // Top panel
        addKorpus(
          `${colLetter}-GOR`,
          getElementPanelDescription(
            "Gornja ploča",
            needsModuleSplit ? topElementKey : colLetter,
          ),
          innerW,
          carcassD,
          needsModuleSplit ? topElementKey : colLetter,
        );

        // Module boundary panels (if h > 200cm) - 2 panels touching
        if (needsModuleSplit) {
          addKorpus(
            `${colLetter}-MB1`,
            getElementPanelDescription("Donja ploča spoja modula", colLetter),
            innerW,
            carcassD,
            colLetter,
          );
          addKorpus(
            `${colLetter}-MB2`,
            getElementPanelDescription(
              "Gornja ploča spoja modula",
              topElementKey,
            ),
            innerW,
            carcassD,
            topElementKey,
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
            getIndexedElementDescription(
              "Polica",
              colLetter,
              shelfIdx + 1,
              "",
              "glavna ",
            ),
            innerW,
            carcassD,
            colLetter,
          );
          shelfTargets.push({
            id: `${colLetter}-P${shelfIdx + 1}`,
            element: colLetter,
            label: `Polica ${colLetter} (${shelfIdx + 1})`,
            width: toCm(innerW),
            height: toCm(carcassD),
            depth: toCm(carcassD),
            area: toCm(innerW) * toCm(carcassD),
            index: shelfTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(innerW),
            outerWidth: toCm(col.width),
          });
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
          const topElementKey = getTopModuleElementKey(colLetter);
          addKorpus(
            `${colLetter}-TP${shelfIdx + 1}`,
            getIndexedElementDescription(
              "Polica",
              topElementKey,
              shelfIdx + 1,
              "",
            ),
            innerW,
            carcassD,
            topElementKey,
          );
          shelfTargets.push({
            id: `${colLetter}-TP${shelfIdx + 1}`,
            element: topElementKey,
            label: `Polica ${topElementKey} (${shelfIdx + 1})`,
            width: toCm(innerW),
            height: toCm(carcassD),
            depth: toCm(carcassD),
            area: toCm(innerW) * toCm(carcassD),
            index: shelfTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(innerW),
            outerWidth: toCm(col.width),
          });
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
      elementKey: string,
      compH: number,
      innerW: number,
      col: { start: number; end: number; width: number },
      allYs: number[],
      numCompartments: number,
    ) => {
      // Get element config for this compartment
      const cfg = elementConfigs[compKey] ?? { columns: 1, rowCounts: [0] };
      const innerCols = Math.max(1, (cfg.columns as number) | 0);
      const drawerFrontClearance = 3 / 1000; // 3mm total visible gap
      const minDrawerFrontSize = 0.1; // 10cm minimum size, matches 3D guard

      // Calculate inner section widths
      const sectionW = innerW / innerCols;
      const getSectionOpeningWidth = (sectionIndex: number) =>
        Math.max(
          sectionW -
            (sectionIndex > 0 ? t / 2 : 0) -
            (sectionIndex < innerCols - 1 ? t / 2 : 0),
          0,
        );

      // Inner vertical dividers (from elementConfigs)
      if (innerCols > 1) {
        for (let divIdx = 1; divIdx < innerCols; divIdx++) {
          addKorpus(
            `${compKey}-VD${divIdx}`,
            `Vertikalni divider ${compKey} (${divIdx})`,
            carcassD,
            compH,
            elementKey,
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
            `Polica ${getElementScope(compKey)} sekcija ${secIdx + 1} (${shelfNum + 1})`,
            secW,
            carcassD,
            elementKey,
          );
          shelfTargets.push({
            id: `${compKey}-S${secIdx + 1}P${shelfNum + 1}`,
            element: elementKey,
            label: `Polica ${compKey} sekcija ${secIdx + 1} (${shelfNum + 1})`,
            width: toCm(secW),
            height: toCm(carcassD),
            depth: toCm(carcassD),
            area: toCm(secW) * toCm(carcassD),
            index: shelfTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(secW),
            outerWidth: toCm(col.width),
          });
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
          elementKey,
        );
      }

      // Drawers (use front material) - from elementConfigs.drawerCounts per section
      for (let secIdx = 0; secIdx < innerCols; secIdx++) {
        const drawerCount = Math.max(
          0,
          Math.floor(cfg.drawerCounts?.[secIdx] ?? 0),
        );
        if (drawerCount <= 0) continue;

        const secW = getSectionOpeningWidth(secIdx);
        const drawerW = Math.max(secW - drawerFrontClearance, 0);
        const shelfCount = Math.max(
          0,
          Math.floor((cfg.rowCounts as number[] | undefined)?.[secIdx] ?? 0),
        );

        const usedCount =
          shelfCount > 0 ? Math.min(drawerCount, shelfCount + 1) : drawerCount;

        let actualDrawerH = 0;
        if (usedCount > 0) {
          if (shelfCount > 0) {
            const slotH = compH / (shelfCount + 1);
            actualDrawerH = Math.max(slotH - t - drawerFrontClearance, 0);
          } else {
            const slotH = compH / usedCount;
            actualDrawerH = Math.max(slotH - drawerFrontClearance, 0);
          }
        }

        if (
          usedCount <= 0 ||
          drawerW < minDrawerFrontSize ||
          actualDrawerH < minDrawerFrontSize
        ) {
          continue;
        }

        totalDrawerCount += usedCount;

        for (let drwIdx = 0; drwIdx < usedCount; drwIdx++) {
          const code =
            innerCols > 1
              ? `${compKey}-S${secIdx + 1}F${drwIdx + 1}`
              : `${compKey}-F${drwIdx + 1}`;
          const desc =
            innerCols > 1
              ? `Fioka ${compKey} sek.${secIdx + 1} (${drwIdx + 1})`
              : `Fioka ${compKey} (${drwIdx + 1})`;
          addFront(code, desc, drawerW, actualDrawerH, elementKey);
          drawerTargets.push({
            id: code,
            element: elementKey,
            label: desc,
            width: toCm(drawerW),
            height: toCm(actualDrawerH),
            depth: toCm(carcassD),
            area: toCm(drawerW) * toCm(actualDrawerH),
            index: drawerTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(secW),
            outerWidth: toCm(col.width),
          });
        }

        // Auto-shelf above drawers if space remains
        const maxDrawers = Math.max(0, Math.floor(compH / minDrawerFrontSize));
        if (usedCount > 0 && usedCount < maxDrawers) {
          const drawersTopY =
            shelfCount > 0
              ? (usedCount * compH) / (shelfCount + 1)
              : (usedCount * compH) / usedCount;
          const remaining = compH - drawersTopY;
          if (remaining >= t) {
            const shelfCode =
              innerCols > 1 ? `${compKey}-S${secIdx + 1}PA` : `${compKey}-PA`;
            addKorpus(
              shelfCode,
              `Polica iznad fioka ${getElementScope(compKey)}`,
              secW,
              carcassD,
              elementKey,
            );
            shelfTargets.push({
              id: shelfCode,
              element: elementKey,
              label: `Polica iznad fioka ${compKey}`,
              width: toCm(secW),
              height: toCm(carcassD),
              depth: toCm(carcassD),
              area: toCm(secW) * toCm(carcassD),
              index: shelfTargets.length,
              columnIndex: colIdx,
              elementInnerWidth: toCm(secW),
              outerWidth: toCm(col.width),
            });
          }
        }
      }

      // Doors - skip per-compartment doors when sliding doors are active
      if (slidingDoors) {
        // Sliding door panels are added separately after all compartments
      } else {
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
                totalDoorLeaves += 2;
                const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
                const isMirror = doorType === "doubleMirror";
                addFrontWithMaterial(
                  `${compKey}-VL`,
                  `Vrata ${compartmentLabel} levo krilo${isMirror ? " (ogledalo)" : ""}`,
                  leafW,
                  totalDoorH,
                  elementKey,
                  doorMaterialId,
                );
                doorTargets.push({
                  id: `${compKey}-VL`,
                  element: elementKey,
                  label: `Vrata ${compartmentLabel} levo krilo${isMirror ? " (ogledalo)" : ""}`,
                  width: toCm(leafW),
                  height: toCm(totalDoorH),
                  depth: toCm(d),
                  area: toCm(leafW) * toCm(totalDoorH),
                  index: doorTargets.length,
                  columnIndex: colIdx,
                  elementInnerWidth: toCm(innerW),
                  outerWidth: toCm(col.width),
                });
                addFrontWithMaterial(
                  `${compKey}-VD`,
                  `Vrata ${compartmentLabel} desno krilo${isMirror ? " (ogledalo)" : ""}`,
                  leafW,
                  totalDoorH,
                  elementKey,
                  doorMaterialId,
                );
                doorTargets.push({
                  id: `${compKey}-VD`,
                  element: elementKey,
                  label: `Vrata ${compartmentLabel} desno krilo${isMirror ? " (ogledalo)" : ""}`,
                  width: toCm(leafW),
                  height: toCm(totalDoorH),
                  depth: toCm(d),
                  area: toCm(leafW) * toCm(totalDoorH),
                  index: doorTargets.length,
                  columnIndex: colIdx,
                  elementInnerWidth: toCm(innerW),
                  outerWidth: toCm(col.width),
                });
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
                    element: elementKey,
                  });
                }
              } else if (doorType === "drawerStyle") {
                totalDoorLeaves += 1;
                // Drawer-style door - no handle (push-to-open)
                addFrontWithMaterial(
                  `${compKey}-V`,
                  `Vrata ${compartmentLabel} (${doorTypeLabel})`,
                  doorW,
                  totalDoorH,
                  elementKey,
                  doorMaterialId,
                );
                doorTargets.push({
                  id: `${compKey}-V`,
                  element: elementKey,
                  label: `Vrata ${compartmentLabel} (${doorTypeLabel})`,
                  width: toCm(doorW),
                  height: toCm(totalDoorH),
                  depth: toCm(d),
                  area: toCm(doorW) * toCm(totalDoorH),
                  index: doorTargets.length,
                  columnIndex: colIdx,
                  elementInnerWidth: toCm(innerW),
                  outerWidth: toCm(col.width),
                });
              } else {
                totalDoorLeaves += 1;
                // Single door (left, right, leftMirror, rightMirror)
                const isMirror =
                  doorType === "leftMirror" || doorType === "rightMirror";
                addFrontWithMaterial(
                  `${compKey}-V`,
                  `Vrata ${compartmentLabel} (${doorTypeLabel})`,
                  doorW,
                  totalDoorH,
                  elementKey,
                  doorMaterialId,
                );
                doorTargets.push({
                  id: `${compKey}-V`,
                  element: elementKey,
                  label: `Vrata ${compartmentLabel} (${doorTypeLabel})${isMirror ? " (ogledalo)" : ""}`,
                  width: toCm(doorW),
                  height: toCm(totalDoorH),
                  depth: toCm(d),
                  area: toCm(doorW) * toCm(totalDoorH),
                  index: doorTargets.length,
                  columnIndex: colIdx,
                  elementInnerWidth: toCm(innerW),
                  outerWidth: toCm(col.width),
                });
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
                    element: elementKey,
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
              totalDoorLeaves += 2;
              const leafW = (doorW - 3 / 1000) / 2; // 3mm gap between leaves
              const isMirror = doorSel === "doubleMirror";
              addFront(
                `${compKey}-VL`,
                `Vrata ${compKey} levo krilo${isMirror ? " (ogledalo)" : ""}`,
                leafW,
                doorH,
                elementKey,
              );
              doorTargets.push({
                id: `${compKey}-VL`,
                element: elementKey,
                label: `Vrata ${compKey} levo krilo${isMirror ? " (ogledalo)" : ""}`,
                width: toCm(leafW),
                height: toCm(doorH),
                depth: toCm(d),
                area: toCm(leafW) * toCm(doorH),
                index: doorTargets.length,
                columnIndex: colIdx,
                elementInnerWidth: toCm(innerW),
                outerWidth: toCm(col.width),
              });
              addFront(
                `${compKey}-VD`,
                `Vrata ${compKey} desno krilo${isMirror ? " (ogledalo)" : ""}`,
                leafW,
                doorH,
                elementKey,
              );
              doorTargets.push({
                id: `${compKey}-VD`,
                element: elementKey,
                label: `Vrata ${compKey} desno krilo${isMirror ? " (ogledalo)" : ""}`,
                width: toCm(leafW),
                height: toCm(doorH),
                depth: toCm(d),
                area: toCm(leafW) * toCm(doorH),
                index: doorTargets.length,
                columnIndex: colIdx,
                elementInnerWidth: toCm(innerW),
                outerWidth: toCm(col.width),
              });
              // Add 2 handles for double doors
              if (handlePrice > 0) {
                handleItems.push({
                  handleId: globalHandleId,
                  finishId: globalHandleFinish,
                  count: 2,
                  price: handlePrice * 2,
                  element: elementKey,
                });
              }
            } else if (doorSel === "drawerStyle") {
              totalDoorLeaves += 1;
              // Drawer-style door - no handle
              addFront(
                `${compKey}-V`,
                `Vrata ${compKey} (fioka stil)`,
                doorW,
                doorH,
                elementKey,
              );
              doorTargets.push({
                id: `${compKey}-V`,
                element: elementKey,
                label: `Vrata ${compKey} (fioka stil)`,
                width: toCm(doorW),
                height: toCm(doorH),
                depth: toCm(d),
                area: toCm(doorW) * toCm(doorH),
                index: doorTargets.length,
                columnIndex: colIdx,
                elementInnerWidth: toCm(innerW),
                outerWidth: toCm(col.width),
              });
            } else {
              totalDoorLeaves += 1;
              addFront(
                `${compKey}-V`,
                `Vrata ${compKey} (${getLegacyDoorTypeLabel(doorSel)})`,
                doorW,
                doorH,
                elementKey,
              );
              doorTargets.push({
                id: `${compKey}-V`,
                element: elementKey,
                label: `Vrata ${compKey} (${getLegacyDoorTypeLabel(doorSel)})`,
                width: toCm(doorW),
                height: toCm(doorH),
                depth: toCm(d),
                area: toCm(doorW) * toCm(doorH),
                index: doorTargets.length,
                columnIndex: colIdx,
                elementInnerWidth: toCm(innerW),
                outerWidth: toCm(col.width),
              });
              // Add 1 handle for single door
              if (handlePrice > 0) {
                handleItems.push({
                  handleId: globalHandleId,
                  finishId: globalHandleFinish,
                  count: 1,
                  price: handlePrice,
                  element: elementKey,
                });
              }
            }
          }
        }
      } // end !slidingDoors

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

      if (innerW > 0 && bottomYEnd > bottomYStart) {
        elementTargets.push({
          id: `${colLetter}-ELEMENT`,
          element: colLetter,
          label: `Element ${colLetter}`,
          width: toCm(innerW),
          height: toCm(bottomYEnd - bottomYStart),
          depth: toCm(carcassD),
          area: toCm(innerW) * toCm(bottomYEnd - bottomYStart),
          index: elementTargets.length,
          columnIndex: colIdx,
          elementInnerWidth: toCm(innerW),
          outerWidth: toCm(col.width),
          outerHeight: toCm(bottomYEnd - bottomYStart + 2 * t),
        });
      }

      // Filter shelves to valid range (stale positions can be outside bounds)
      const bottomSortedYs = [...bottomShelfYs]
        .filter((y) => y > bottomYStart && y < bottomYEnd)
        .sort((a, b) => a - b);
      const bottomNumComps = bottomSortedYs.length + 1;
      const bottomAllYs = [bottomYStart, ...bottomSortedYs, bottomYEnd];

      for (let compIdx = 0; compIdx < bottomNumComps; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        const elementKey = colLetter;
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
          elementKey,
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

        if (innerW > 0 && topYEnd > topYStart) {
          const topElementKey = getTopModuleElementKey(colLetter);
          elementTargets.push({
            id: `${topElementKey}-ELEMENT`,
            element: topElementKey,
            label: `Element ${topElementKey}`,
            width: toCm(innerW),
            height: toCm(topYEnd - topYStart),
            depth: toCm(carcassD),
            area: toCm(innerW) * toCm(topYEnd - topYStart),
            index: elementTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(innerW),
            outerWidth: toCm(col.width),
            outerHeight: toCm(topYEnd - topYStart + 2 * t),
          });
        }

        // Filter shelves to valid range (stale positions can be outside bounds)
        const topSortedYs = [...topShelfYs]
          .filter((y) => y > topYStart && y < topYEnd)
          .sort((a, b) => a - b);
        const topNumComps = topSortedYs.length + 1;
        const topAllYs = [topYStart, ...topSortedYs, topYEnd];

        for (let compIdx = 0; compIdx < topNumComps; compIdx++) {
          // Top module compartments continue numbering (e.g., A2, A3, etc.)
          const compKey = `${colLetter}${bottomNumComps + compIdx + 1}`;
          const elementKey = getTopModuleElementKey(colLetter);
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
            elementKey,
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
            getElementPanelDescription("Zadnja strana", colLetter),
            backW,
            bottomH,
            colLetter,
          );
        }
        if (backW > 0 && topH > 0) {
          const topElementKey = getTopModuleElementKey(colLetter);
          addBack(
            `${colLetter}-ZG`,
            getElementPanelDescription("Zadnja strana", topElementKey),
            backW,
            topH,
            topElementKey,
          );
        }
      } else {
        // Single module: one back panel
        const backH = Math.max(h - (hasBase ? baseH : 0) - backClearance, 0);
        if (backW > 0 && backH > 0) {
          addBack(
            `${colLetter}-Z`,
            getElementPanelDescription("Zadnja strana", colLetter),
            backW,
            backH,
            colLetter,
          );
        }
      }
    });

    // ==========================================
    // 7. SLIDING DOOR PANELS (one per column)
    // ==========================================
    if (slidingDoors) {
      columns.forEach((col, colIdx) => {
        const colLetter = String.fromCharCode(65 + colIdx);
        const colInnerW = Math.max(col.width - 2 * t, 0);
        const panelW = colInnerW + SLIDING_DOOR_OVERLAP_M;
        const panelH = h - (hasBase ? baseH : 0);

        if (panelW > 0 && panelH > 0) {
          addFront(
            `KV-${colLetter}`,
            `Klizeća vrata ${colLetter}`,
            panelW,
            panelH,
            `KV-${colLetter}`,
          );
          totalDoorLeaves += 1;
          slidingDoorTargets.push({
            id: `KV-${colLetter}`,
            element: `KV-${colLetter}`,
            label: `Klizeća vrata ${colLetter}`,
            width: toCm(panelW),
            height: toCm(panelH),
            depth: toCm(d),
            area: toCm(panelW) * toCm(panelH),
            index: slidingDoorTargets.length,
            columnIndex: colIdx,
            elementInnerWidth: toCm(Math.max(col.width - 2 * t, 0)),
            outerWidth: toCm(col.width),
          });
        }
      });
    }

    const baseTotalArea = items.reduce((sum, item) => sum + item.areaM2, 0);

    if (accessoryRules.length > 0) {
      const elementConfigValues = Object.values(elementConfigs);
      const doorMetrics = computeDoorMetrics(
        snapshot as Record<string, unknown>,
        handles,
      );
      const shelfCount = computeShelfCount({
        ...snapshot,
        panelThickness: Number(mat?.thickness ?? 18),
      });
      const compartmentCount = computeCompartmentCount({
        ...snapshot,
        panelThickness: Number(mat?.thickness ?? 18),
      });
      const verticalDividerCount = elementConfigValues.filter(
        (cfg) => (cfg?.columns ?? 1) > 1,
      ).length;
      const boardCount = countBoardsExcludingShelvesAndBacks(items);
      const hasMirror =
        doorMetrics.mirrorDoorCount > 0 ||
        Object.values(doorSelections).some((door) =>
          String(door).toLowerCase().includes("mirror"),
        );
      const resolvedDoorCount = Math.max(
        totalDoorLeaves,
        doorMetrics.singleDoorCount +
          doorMetrics.drawerStyleDoorCount +
          doorMetrics.doubleDoorCount * 2,
      );
      const wardrobeContext = {
        width: snapshot.width,
        height: snapshot.height,
        depth: snapshot.depth,
        area: baseTotalArea,
        columnCount: numColumns,
        shelfCount,
        compartmentCount,
        doorCount: resolvedDoorCount,
        drawerCount: totalDrawerCount,
        boardCount,
        hasBase,
        hasDoors: totalDoorLeaves > 0,
        hasDrawers: totalDrawerCount > 0,
        hasMirror,
        slidingDoors,
        hasRod: Object.values(compartmentExtras).some((extra) => extra?.rod),
        hasLed: Object.values(compartmentExtras).some((extra) => extra?.led),
        hasVerticalDivider: verticalDividerCount > 0,
        rodCount: Object.values(compartmentExtras).filter((extra) => extra?.rod)
          .length,
        ledCount: Object.values(compartmentExtras).filter((extra) => extra?.led)
          .length,
        verticalDividerCount,
        baseHeight: hasBase ? baseHeight : 0,
        ...doorMetrics,
        material: {
          id: snapshot.selectedMaterialId,
          name: mat?.name ?? "",
        },
        frontMaterial: {
          id: snapshot.selectedFrontMaterialId ?? null,
          name: frontMat?.name ?? "",
        },
        backMaterial: {
          id: snapshot.selectedBackMaterialId ?? null,
          name: backMat?.name ?? "",
        },
      };

      const targetsByType = {
        elements: elementTargets,
        doors: doorTargets,
        drawers: drawerTargets,
        shelves: shelfTargets,
        sliding_doors: slidingDoorTargets,
      } as const;

      const materialDefaults = {
        korpus: {
          thicknessMm: toMm(t),
          pricePerM2,
        },
        front: {
          thicknessMm: toMm(frontT),
          pricePerM2: frontPricePerM2,
        },
        back: {
          thicknessMm: toMm(actualBackT),
          pricePerM2: backPricePerM2,
        },
      };

      accessoryRules.forEach((rule) => {
        if (!rule.enabled) {
          return;
        }

        if (
          !matchesAccessoryRuleConditions(
            rule.conditions as AccessoryRule["conditions"],
            {
              wardrobe: wardrobeContext,
            },
          )
        ) {
          return;
        }

        if (!(rule.target in targetsByType)) {
          return;
        }

        const targets =
          targetsByType[rule.target as keyof typeof targetsByType] ?? [];
        targets.forEach((target) => {
          const materialType = rule.config.materialType ?? "korpus";
          const defaults = materialDefaults[materialType];
          const formulaContext = {
            wardrobe: {
              ...wardrobeContext,
              materialThickness: toMm(t),
              frontThickness: toMm(frontT),
              backThickness: toMm(actualBackT),
            },
            target,
            material: {
              selectedThickness: defaults.thicknessMm,
              korpusThickness: toMm(t),
              frontThickness: toMm(frontT),
              backThickness: toMm(actualBackT),
            },
          };

          const quantityValue = evaluateNumericFormula(
            rule.config.quantity ?? 1,
            formulaContext,
          );
          const quantity = Math.max(0, Math.round(quantityValue ?? 0));
          if (quantity <= 0) {
            return;
          }

          const widthCm = evaluateNumericFormula(
            rule.config.widthFormula,
            formulaContext,
          );
          const heightCm = evaluateNumericFormula(
            rule.config.heightFormula,
            formulaContext,
          );
          const thicknessMm =
            evaluateNumericFormula(
              rule.config.thicknessFormula,
              formulaContext,
            ) ?? defaults.thicknessMm;

          if (
            widthCm === null ||
            heightCm === null ||
            !Number.isFinite(widthCm) ||
            !Number.isFinite(heightCm) ||
            !Number.isFinite(thicknessMm) ||
            widthCm <= 0 ||
            heightCm <= 0 ||
            thicknessMm <= 0
          ) {
            return;
          }

          const areaM2 = (widthCm / 100) * (heightCm / 100);
          const itemName = rule.config.itemName.trim() || rule.name;

          for (let itemIndex = 0; itemIndex < quantity; itemIndex++) {
            items.push({
              code: `${sanitizeCodePart(rule.config.codePrefix || "DOD")}-${sanitizeCodePart(rule.id.slice(0, 8))}-${sanitizeCodePart(target.id)}-${itemIndex + 1}`,
              desc:
                quantity > 1
                  ? `${itemName} - ${target.label} (${itemIndex + 1}/${quantity})`
                  : `${itemName} - ${target.label}`,
              widthCm,
              heightCm,
              thicknessMm,
              areaM2,
              cost: areaM2 * defaults.pricePerM2,
              element: target.element,
              materialType,
            });
          }
        });
      });
    }

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

    // Accessory pricing
    const selectedAccessories = snapshot.selectedAccessories ?? {};
    const accessoryItems: {
      name: string;
      qty: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const acc of accessories) {
      const selectedVariantId = selectedAccessories[acc.id];
      if (!selectedVariantId || acc.pricingRule === "none") continue;

      const variant = acc.variants.find((v) => v.id === selectedVariantId);
      if (!variant) continue;

      let qty = 0;
      if (acc.pricingRule === "perDrawer")
        qty = totalDrawerCount * acc.qtyPerUnit;
      else if (acc.pricingRule === "perDoor")
        qty = totalDoorLeaves * acc.qtyPerUnit;
      else if (acc.pricingRule === "fixed") qty = acc.qtyPerUnit;

      if (qty > 0) {
        accessoryItems.push({
          name: acc.name,
          qty,
          unitPrice: variant.price,
          totalPrice: qty * variant.price,
        });
      }
    }

    const totalAccessoryCount = accessoryItems.reduce(
      (sum, a) => sum + a.qty,
      0,
    );
    const totalAccessoryPrice = accessoryItems.reduce(
      (sum, a) => sum + a.totalPrice,
      0,
    );

    // Add accessory items to cut list for transparency
    accessoryItems.forEach((a) => {
      items.push({
        code: `ACC-${a.name}`,
        desc: `${a.name} (${a.qty}x \u00d7 ${a.unitPrice.toLocaleString("sr-RS")} RSD)`,
        widthCm: 0,
        heightCm: 0,
        thicknessMm: 0,
        areaM2: 0,
        cost: a.totalPrice,
        element: "accessories",
        materialType: "accessories",
      });
    });

    // Total cost includes materials + handles + accessories
    const totalCost = materialCost + totalHandlePrice + totalAccessoryPrice;

    // Group by element
    const grouped = items.reduce((acc: Record<string, CutListItem[]>, it) => {
      const groupKey = getCutListGroupKey(it.element);
      (acc[groupKey] = acc[groupKey] || []).push(it);
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
      accessories: {
        count: totalAccessoryCount,
        price: Math.round(totalAccessoryPrice),
      },
    };

    return { items, grouped, totalArea, totalCost, pricePerM2, priceBreakdown };
  } catch {
    return emptyCutList;
  }
}
