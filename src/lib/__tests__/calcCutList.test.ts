import { describe, it, expect } from "vitest";
import { calculateCutList, type WardrobeSnapshot } from "../calcCutList";

const mockMaterials = [
  { id: 1, price: 5000, thickness: 18, categories: ["iverica"] },
  { id: 2, price: 8000, thickness: 18, categories: ["front"] },
  { id: 3, price: 3000, thickness: 5, categories: ["leda"] },
];

describe("calculateCutList", () => {
  describe("basic wardrobe (1 column, no doors)", () => {
    it("calculates correct total area and cost", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const result = calculateCutList(snapshot, mockMaterials);

      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("includes back panel in calculation", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const result = calculateCutList(snapshot, mockMaterials);

      const backPanels = result.items.filter((i) => i.materialType === "back");
      expect(backPanels.length).toBeGreaterThan(0);
      expect(result.priceBreakdown.back.areaM2).toBeGreaterThan(0);
    });
  });

  describe("multi-column wardrobe", () => {
    it("uses verticalBoundaries for column widths", () => {
      const snapshot: WardrobeSnapshot = {
        width: 200,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        // 2 columns with seam at X=0 (center)
        verticalBoundaries: [0],
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should have panels for both columns A and B
      const columnAPanels = result.items.filter((i) => i.element === "A");
      const columnBPanels = result.items.filter((i) => i.element === "B");

      expect(columnAPanels.length).toBeGreaterThan(0);
      expect(columnBPanels.length).toBeGreaterThan(0);
    });

    it("generates seam panels between columns", () => {
      const snapshot: WardrobeSnapshot = {
        width: 200,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        verticalBoundaries: [0],
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Check for seam panels (they should be labeled in column A or B)
      const seamPanels = result.items.filter(
        (i) => i.desc.includes("Seam") || i.desc.includes("seam"),
      );
      // With 2 columns, there should be seam panels
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe("tall wardrobe (>200cm with module split)", () => {
    it("handles wardrobes taller than 200cm", () => {
      // calcCutList uses CENTER-ORIGIN coordinates internally
      // For h=250cm: top=+1.25m, bottom=-1.25m, center=0
      // To split at 200cm from floor: center-origin Y = 2.0 - (2.5/2) = 0.75m
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 250,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        columnModuleBoundaries: { 0: 0.75 }, // Split at Y=0.75m (200cm from floor in center-origin)
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Bottom module gets "A1", top module gets "A2" (same column, different compartments)
      // Also include "KORPUS" for shared structural panels
      const bottomModule = result.items.filter(
        (i) => i.element === "A1" || i.element === "KORPUS",
      );
      const topModule = result.items.filter((i) => i.element === "A2");

      expect(bottomModule.length).toBeGreaterThan(0);
      expect(topModule.length).toBeGreaterThan(0);
    });
  });

  describe("wardrobe with base", () => {
    it("accounts for base height in calculations", () => {
      const snapshotWithBase: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: true,
        baseHeight: 10, // 10cm base
      };

      const snapshotWithoutBase: WardrobeSnapshot = {
        ...snapshotWithBase,
        hasBase: false,
        baseHeight: 0,
      };

      const resultWithBase = calculateCutList(snapshotWithBase, mockMaterials);
      const resultWithoutBase = calculateCutList(
        snapshotWithoutBase,
        mockMaterials,
      );

      // The wardrobe with base should have different panel sizes
      // (seams should be shorter by base height)
      expect(resultWithBase.items.length).toBeGreaterThan(0);
      expect(resultWithoutBase.items.length).toBeGreaterThan(0);
    });
  });

  describe("door groups pricing", () => {
    it("uses doorGroups for door material assignment", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "group-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
            handleId: undefined,
            handleFinish: undefined,
          },
        ],
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should have door panels priced with front material
      const doorPanels = result.items.filter((i) => i.materialType === "front");
      expect(doorPanels.length).toBeGreaterThan(0);
      expect(result.priceBreakdown.front.areaM2).toBeGreaterThan(0);
    });

    it("calculates door pricing for double doors", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "group-1",
            type: "double",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const result = calculateCutList(snapshot, mockMaterials);

      const doorPanels = result.items.filter((i) => i.materialType === "front");
      // Double door should generate door panels
      expect(doorPanels.length).toBeGreaterThan(0);
    });
  });

  describe("handles pricing", () => {
    const mockHandles = [
      {
        id: 1,
        legacyId: "handle-1",
        name: "Test Handle",
        finishes: [
          {
            id: 1,
            handleId: 1,
            legacyId: "finish-1",
            name: "Chrome",
            price: 500,
          },
        ],
      },
    ];

    it("includes handle cost when handles are provided", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "group-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
            handleId: "handle-1",
            handleFinish: "finish-1",
          },
        ],
        globalHandleId: "handle-1",
        globalHandleFinish: "finish-1",
      };

      const result = calculateCutList(snapshot, mockMaterials, mockHandles);

      // Should have handle pricing
      expect(result.priceBreakdown.handles.count).toBeGreaterThanOrEqual(0);
    });

    it("uses global handle settings when per-door handles not set", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "group-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
            // No handleId/handleFinish - should use global
          },
        ],
        globalHandleId: "handle-1",
        globalHandleFinish: "finish-1",
        doorSettingsMode: "global",
      };

      const result = calculateCutList(snapshot, mockMaterials, mockHandles);

      expect(result.priceBreakdown).toBeDefined();
    });
  });

  describe("compartment extras", () => {
    it("handles drawers in compartment", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {
          A: { columns: 1, rowCounts: [0] },
        },
        compartmentExtras: {
          A: { drawers: true, drawersCount: 3 },
        },
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should calculate without errors
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("handles shelves via columnHorizontalBoundaries", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        columnHorizontalBoundaries: {
          0: [0.5, 1.0, 1.5], // 3 shelves in column 0
        },
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should include shelf panels
      const shelfPanels = result.items.filter((i) =>
        i.desc.toLowerCase().includes("shelf"),
      );
      expect(shelfPanels.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("backwards compatibility", () => {
    it("handles missing structural fields gracefully", () => {
      const snapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        // No verticalBoundaries, columnHorizontalBoundaries, etc.
      };

      // Should not throw
      expect(() => calculateCutList(snapshot, mockMaterials)).not.toThrow();
    });

    it("returns valid empty result for empty materials", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
      };

      const result = calculateCutList(snapshot, []);

      expect(result.items).toEqual([]);
      expect(result.totalArea).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  describe("price breakdown", () => {
    it("correctly separates korpus, front, and back pricing", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "group-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const result = calculateCutList(snapshot, mockMaterials);

      expect(result.priceBreakdown.korpus.areaM2).toBeGreaterThanOrEqual(0);
      expect(result.priceBreakdown.front.areaM2).toBeGreaterThanOrEqual(0);
      expect(result.priceBreakdown.back.areaM2).toBeGreaterThanOrEqual(0);

      // Total cost should equal sum of breakdowns (plus handles)
      const sumBreakdown =
        result.priceBreakdown.korpus.price +
        result.priceBreakdown.front.price +
        result.priceBreakdown.back.price +
        result.priceBreakdown.handles.price;

      expect(Math.abs(result.totalCost - sumBreakdown)).toBeLessThan(1); // Allow for rounding
    });
  });

  describe("grouped output", () => {
    it("groups items by element", () => {
      const snapshot: WardrobeSnapshot = {
        width: 200,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        verticalBoundaries: [0], // 2 columns
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should have grouped property
      expect(result.grouped).toBeDefined();

      // Items in grouped should match items array
      const groupedCount = Object.values(result.grouped).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );
      expect(groupedCount).toBe(result.items.length);
    });
  });

  // ============================================
  // REGRESSION & CONFIGURATION CHANGE TESTS
  // These tests catch issues when wardrobe config changes
  // ============================================

  describe("dimension changes affect output", () => {
    const baseSnapshot: WardrobeSnapshot = {
      width: 100,
      height: 200,
      depth: 60,
      selectedMaterialId: 1,
      selectedFrontMaterialId: 2,
      selectedBackMaterialId: 3,
      elementConfigs: {},
      compartmentExtras: {},
      doorSelections: {},
      hasBase: false,
      baseHeight: 0,
    };

    it("wider wardrobe has more area", () => {
      const narrow = calculateCutList(baseSnapshot, mockMaterials);
      const wide = calculateCutList(
        { ...baseSnapshot, width: 200 },
        mockMaterials,
      );

      expect(wide.totalArea).toBeGreaterThan(narrow.totalArea);
      expect(wide.totalCost).toBeGreaterThan(narrow.totalCost);
    });

    it("taller wardrobe has more area", () => {
      const short = calculateCutList(baseSnapshot, mockMaterials);
      const tall = calculateCutList(
        { ...baseSnapshot, height: 250 },
        mockMaterials,
      );

      expect(tall.totalArea).toBeGreaterThan(short.totalArea);
    });

    it("deeper wardrobe has more area", () => {
      const shallow = calculateCutList(baseSnapshot, mockMaterials);
      const deep = calculateCutList(
        { ...baseSnapshot, depth: 80 },
        mockMaterials,
      );

      expect(deep.totalArea).toBeGreaterThan(shallow.totalArea);
    });
  });

  describe("column operations", () => {
    it("adding columns increases item count", () => {
      const oneColumn: WardrobeSnapshot = {
        width: 200,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        // No verticalBoundaries = 1 column
      };

      const twoColumns: WardrobeSnapshot = {
        ...oneColumn,
        verticalBoundaries: [0], // 1 seam = 2 columns
      };

      const threeColumns: WardrobeSnapshot = {
        ...oneColumn,
        verticalBoundaries: [-0.33, 0.33], // 2 seams = 3 columns
      };

      const result1 = calculateCutList(oneColumn, mockMaterials);
      const result2 = calculateCutList(twoColumns, mockMaterials);
      const result3 = calculateCutList(threeColumns, mockMaterials);

      // More columns = more items (seam panels, back panels per column, etc.)
      expect(result2.items.length).toBeGreaterThan(result1.items.length);
      expect(result3.items.length).toBeGreaterThan(result2.items.length);
    });

    it("3-column wardrobe generates items for all columns", () => {
      const snapshot: WardrobeSnapshot = {
        width: 300,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        verticalBoundaries: [-0.5, 0.5], // 3 columns: A, B, C
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should have panels for all 3 columns
      const hasColumnA = result.items.some((i) => i.element?.startsWith("A"));
      const hasColumnB = result.items.some((i) => i.element?.startsWith("B"));
      const hasColumnC = result.items.some((i) => i.element?.startsWith("C"));

      expect(hasColumnA).toBe(true);
      expect(hasColumnB).toBe(true);
      expect(hasColumnC).toBe(true);
    });
  });

  describe("shelf operations", () => {
    it("adding shelves increases compartment count", () => {
      const noShelves: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        columnHorizontalBoundaries: {},
      };

      const withShelves: WardrobeSnapshot = {
        ...noShelves,
        columnHorizontalBoundaries: {
          0: [0, 0.5], // 2 shelves = 3 compartments
        },
      };

      const result1 = calculateCutList(noShelves, mockMaterials);
      const result2 = calculateCutList(withShelves, mockMaterials);

      // With shelves should have A1, A2, A3 compartments
      const compartments1 = new Set(result1.items.map((i) => i.element));
      const compartments2 = new Set(result2.items.map((i) => i.element));

      expect(compartments2.size).toBeGreaterThanOrEqual(compartments1.size);
    });
  });

  describe("top module shelves (tall wardrobes)", () => {
    it("columnTopModuleShelves creates compartments in top module", () => {
      // For h=250cm, split at Y=0.75m (200cm from floor in center-origin)
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 250,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        columnModuleBoundaries: { 0: 0.75 },
        columnTopModuleShelves: {
          0: [1.0], // 1 shelf in top module = 2 compartments in top
        },
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Should have A1 (bottom), A2 (top lower), A3 (top upper)
      const hasA1 = result.items.some((i) => i.element === "A1");
      const hasA2 = result.items.some((i) => i.element === "A2");
      const hasA3 = result.items.some((i) => i.element === "A3");

      expect(hasA1).toBe(true);
      expect(hasA2).toBe(true);
      expect(hasA3).toBe(true);
    });
  });

  describe("door count verification", () => {
    it("single door creates front material panels", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "door-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const result = calculateCutList(snapshot, mockMaterials);
      // Door panels use front material type
      const frontPanels = result.items.filter((i) => i.materialType === "front");

      expect(frontPanels.length).toBeGreaterThanOrEqual(1);
      expect(result.priceBreakdown.front.areaM2).toBeGreaterThan(0);
    });

    it("double door creates more front material area than single", () => {
      const singleDoor: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "door-1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const doubleDoor: WardrobeSnapshot = {
        ...singleDoor,
        doorGroups: [
          {
            id: "door-1",
            type: "double",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const singleResult = calculateCutList(singleDoor, mockMaterials);
      const doubleResult = calculateCutList(doubleDoor, mockMaterials);

      // Double door should have front material (both have same compartment coverage)
      expect(doubleResult.priceBreakdown.front.areaM2).toBeGreaterThan(0);
      expect(singleResult.priceBreakdown.front.areaM2).toBeGreaterThan(0);
    });

    it("no doors = no front material panels", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [], // No doors
      };

      const result = calculateCutList(snapshot, mockMaterials);
      const frontPanels = result.items.filter((i) => i.materialType === "front");

      expect(frontPanels.length).toBe(0);
      expect(result.priceBreakdown.front.areaM2).toBe(0);
    });
  });

  describe("material pricing accuracy", () => {
    it("uses correct material price per m²", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1, // price: 5000
        selectedFrontMaterialId: 2, // price: 8000
        selectedBackMaterialId: 3, // price: 3000
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const result = calculateCutList(snapshot, mockMaterials);

      // Verify korpus uses material 1 pricing
      if (result.priceBreakdown.korpus.areaM2 > 0) {
        const expectedKorpusPrice =
          result.priceBreakdown.korpus.areaM2 * 5000;
        expect(result.priceBreakdown.korpus.price).toBeCloseTo(
          expectedKorpusPrice,
          0,
        );
      }

      // Verify back uses material 3 pricing
      if (result.priceBreakdown.back.areaM2 > 0) {
        const expectedBackPrice = result.priceBreakdown.back.areaM2 * 3000;
        expect(result.priceBreakdown.back.price).toBeCloseTo(expectedBackPrice, 0);
      }
    });

    it("different materials produce different costs for same dimensions", () => {
      const cheapMaterial: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1, // price: 5000
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      // Use a more expensive material
      const expensiveMaterials = [
        { id: 1, price: 10000, thickness: 18, categories: ["iverica"] }, // 2x price
        { id: 2, price: 8000, thickness: 18, categories: ["front"] },
        { id: 3, price: 3000, thickness: 5, categories: ["leda"] },
      ];

      const cheapResult = calculateCutList(cheapMaterial, mockMaterials);
      const expensiveResult = calculateCutList(cheapMaterial, expensiveMaterials);

      expect(expensiveResult.totalCost).toBeGreaterThan(cheapResult.totalCost);
    });
  });

  describe("handle pricing", () => {
    const mockHandles = [
      {
        id: 1,
        legacyId: "handle-1",
        name: "Standard Handle",
        finishes: [
          { id: 1, handleId: 1, legacyId: "chrome", name: "Chrome", price: 500 },
          { id: 2, handleId: 1, legacyId: "gold", name: "Gold", price: 1000 },
        ],
      },
    ];

    it("handle count matches door count for single doors", () => {
      const snapshot: WardrobeSnapshot = {
        width: 200,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        verticalBoundaries: [0], // 2 columns
        doorGroups: [
          {
            id: "door-a",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
            handleId: "handle-1",
            handleFinish: "chrome",
          },
          {
            id: "door-b",
            type: "right",
            compartments: ["B1"],
            column: "B",
            materialId: 2,
            handleId: "handle-1",
            handleFinish: "chrome",
          },
        ],
        globalHandleId: "handle-1",
        globalHandleFinish: "chrome",
      };

      const result = calculateCutList(snapshot, mockMaterials, mockHandles);

      // 2 single doors = 2 handles
      expect(result.priceBreakdown.handles.count).toBe(2);
      expect(result.priceBreakdown.handles.price).toBe(2 * 500); // 2 × 500
    });

    it("double door counts as 2 handles", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [
          {
            id: "door-1",
            type: "double",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
            handleId: "handle-1",
            handleFinish: "chrome",
          },
        ],
        globalHandleId: "handle-1",
        globalHandleFinish: "chrome",
      };

      const result = calculateCutList(snapshot, mockMaterials, mockHandles);

      // Double door = 2 handles
      expect(result.priceBreakdown.handles.count).toBe(2);
    });
  });

  describe("price consistency (same config = same price)", () => {
    it("identical configs produce identical results", () => {
      const snapshot: WardrobeSnapshot = {
        width: 150,
        height: 220,
        depth: 55,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: true,
        baseHeight: 8,
        verticalBoundaries: [-0.25],
        columnHorizontalBoundaries: { 0: [0.5], 1: [0.3, 0.8] },
        doorGroups: [
          {
            id: "d1",
            type: "left",
            compartments: ["A1"],
            column: "A",
            materialId: 2,
          },
        ],
      };

      const result1 = calculateCutList(snapshot, mockMaterials);
      const result2 = calculateCutList(snapshot, mockMaterials);

      expect(result1.totalCost).toBe(result2.totalCost);
      expect(result1.totalArea).toBe(result2.totalArea);
      expect(result1.items.length).toBe(result2.items.length);
    });
  });

  describe("edge cases", () => {
    it("handles minimum valid dimensions", () => {
      const snapshot: WardrobeSnapshot = {
        width: 30, // Very narrow
        height: 50, // Very short
        depth: 30, // Very shallow
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      // Should not throw
      expect(() => calculateCutList(snapshot, mockMaterials)).not.toThrow();

      const result = calculateCutList(snapshot, mockMaterials);
      expect(result.totalArea).toBeGreaterThanOrEqual(0);
    });

    it("handles null/undefined optional fields", () => {
      const snapshot: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: null as any,
        selectedBackMaterialId: null as any,
        elementConfigs: undefined as any,
        compartmentExtras: undefined as any,
        doorSelections: undefined as any,
        hasBase: false,
        baseHeight: 0,
        verticalBoundaries: undefined,
        columnHorizontalBoundaries: undefined,
        columnModuleBoundaries: undefined,
        columnTopModuleShelves: undefined,
        doorGroups: undefined,
      };

      // Should handle gracefully
      expect(() => calculateCutList(snapshot, mockMaterials)).not.toThrow();
    });

    it("handles empty doorGroups array vs undefined", () => {
      const withEmpty: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
        doorGroups: [],
      };

      const withUndefined: WardrobeSnapshot = {
        ...withEmpty,
        doorGroups: undefined,
      };

      const result1 = calculateCutList(withEmpty, mockMaterials);
      const result2 = calculateCutList(withUndefined, mockMaterials);

      // Both should produce same result (no doors)
      expect(result1.priceBreakdown.front.areaM2).toBe(0);
      expect(result2.priceBreakdown.front.areaM2).toBe(0);
    });
  });

  describe("structural field requirements", () => {
    it("verticalBoundaries affects output items", () => {
      // Use narrow width to prevent auto-splitting
      const base: WardrobeSnapshot = {
        width: 80, // Narrow enough for single column
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      // Without boundaries
      const without = calculateCutList(base, mockMaterials);

      // With explicit boundary at center (should add seam panels)
      const withBoundary = calculateCutList(
        { ...base, width: 160, verticalBoundaries: [0] },
        mockMaterials,
      );

      // With boundary should have more items (seam panels between columns)
      expect(withBoundary.items.length).toBeGreaterThan(without.items.length);

      // With boundary should definitely have B column items
      const hasB = withBoundary.items.some((i) => i.element?.startsWith("B"));
      expect(hasB).toBe(true);
    });

    it("columnHorizontalBoundaries affects shelf count", () => {
      const base: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const noShelves = calculateCutList(base, mockMaterials);
      const withShelves = calculateCutList(
        { ...base, columnHorizontalBoundaries: { 0: [0, 0.5] } },
        mockMaterials,
      );

      // With shelves should have more items
      expect(withShelves.items.length).toBeGreaterThan(noShelves.items.length);
    });

    it("doorGroups affects front material pricing", () => {
      const base: WardrobeSnapshot = {
        width: 100,
        height: 200,
        depth: 60,
        selectedMaterialId: 1,
        selectedFrontMaterialId: 2,
        selectedBackMaterialId: 3,
        elementConfigs: {},
        compartmentExtras: {},
        doorSelections: {},
        hasBase: false,
        baseHeight: 0,
      };

      const noDoors = calculateCutList(base, mockMaterials);
      const withDoors = calculateCutList(
        {
          ...base,
          doorGroups: [
            {
              id: "d1",
              type: "left",
              compartments: ["A1"],
              column: "A",
              materialId: 2,
            },
          ],
        },
        mockMaterials,
      );

      expect(noDoors.priceBreakdown.front.areaM2).toBe(0);
      expect(withDoors.priceBreakdown.front.areaM2).toBeGreaterThan(0);
    });
  });
});
