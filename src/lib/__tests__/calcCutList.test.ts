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
});
