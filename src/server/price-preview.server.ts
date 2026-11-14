import { asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
  accessories,
  accessoryRules,
  accessoryVariants,
  handleFinishes,
  handles,
  materials,
  rules,
} from "@/db/schema";
import {
  calculateCutList,
  countBoardsExcludingShelvesAndBacks,
} from "@/lib/calcCutList";
import {
  buildInstallationServiceAdjustment,
  isInstallationServiceType,
} from "@/lib/installation-service";
import {
  applyRules,
  calculateFinalPrice,
  computeCompartmentCount,
  computeDoorMetrics,
  computeShelfCount,
  getVisibleAdjustments,
  type Rule,
  type RuleContext,
} from "@/lib/rules";

// The price the configurator shows next to a design: the cut list priced
// from the catalog, then the price rules. One place works it out, for the
// configurator's own preview request (/api/rules/preview) and for the price
// guide given to AI assistants (price-guide.server.ts), so the two cannot
// drift apart. Checkout prices the order itself, in its own handler.

/** Everything the price depends on besides the design and the customer. */
export async function loadPricingCatalog() {
  // Independent catalog reads: one round trip instead of five in a row.
  const [
    pricingMaterials,
    enabledAccessoryRules,
    pricingHandles,
    allFinishes,
    pricingAccessories,
    allAccessoryVariants,
  ] = await Promise.all([
    db
      .select({
        id: materials.id,
        name: materials.name,
        price: materials.price,
        thickness: materials.thickness,
        categories: materials.categories,
      })
      .from(materials),
    db.select().from(accessoryRules).where(eq(accessoryRules.enabled, true)),
    db
      .select({
        id: handles.id,
        legacyId: handles.legacyId,
        name: handles.name,
      })
      .from(handles)
      .where(eq(handles.published, true)),
    db
      .select({
        id: handleFinishes.id,
        handleId: handleFinishes.handleId,
        legacyId: handleFinishes.legacyId,
        name: handleFinishes.name,
        price: handleFinishes.price,
      })
      .from(handleFinishes),
    db
      .select({
        id: accessories.id,
        name: accessories.name,
        category: accessories.category,
        pricingRule: accessories.pricingRule,
        qtyPerUnit: accessories.qtyPerUnit,
      })
      .from(accessories)
      .where(eq(accessories.published, true)),
    db
      .select({
        id: accessoryVariants.id,
        accessoryId: accessoryVariants.accessoryId,
        name: accessoryVariants.name,
        price: accessoryVariants.price,
      })
      .from(accessoryVariants),
  ]);
  const enabledRules = await db
    .select()
    .from(rules)
    .where(eq(rules.enabled, true))
    .orderBy(asc(rules.priority), asc(rules.createdAt));
  const matMap = new Map(pricingMaterials.map((m) => [Number(m.id), m.name]));
  const handlesWithFinishes = pricingHandles.map((h) => ({
    ...h,
    finishes: allFinishes.filter((f) => f.handleId === h.id),
  }));
  const accessoriesWithVariants = pricingAccessories.map((accessory) => ({
    ...accessory,
    variants: allAccessoryVariants.filter(
      (variant) => variant.accessoryId === accessory.id,
    ),
  }));
  return {
    pricingMaterials,
    enabledAccessoryRules,
    handlesWithFinishes,
    accessoriesWithVariants,
    enabledRules,
    matMap,
  };
}

export type PricingCatalog = Awaited<ReturnType<typeof loadPricingCatalog>>;

export interface PricePreviewInput {
  /** The design as the configurator serializes it. */
  // biome-ignore lint/suspicious/noExplicitAny: saved designs of every age arrive here, read field by field with fallbacks
  snapshot: any;
  // The ids sent beside the design; the design's own ids win when present.
  materialId: unknown;
  frontMaterialId?: unknown;
  backMaterialId?: unknown;
  edgeMaterialId?: unknown;
  frontEdgeMaterialId?: unknown;
  /** Rules may depend on who is buying; an anonymous visitor has none of it. */
  customer: { tags: string[]; email?: string; orderCount: number };
  shippingCity?: unknown;
  installationService?: unknown;
}

export const ANONYMOUS: PricePreviewInput["customer"] = {
  tags: [],
  orderCount: 0,
};

export function previewPrice(
  input: PricePreviewInput,
  catalog: PricingCatalog,
) {
  const {
    snapshot,
    materialId,
    frontMaterialId,
    backMaterialId,
    edgeMaterialId,
    frontEdgeMaterialId,
    shippingCity,
    installationService,
  } = input;
  const {
    pricingMaterials,
    enabledAccessoryRules,
    handlesWithFinishes,
    accessoriesWithVariants,
    enabledRules,
    matMap,
  } = catalog;

  // Count wardrobe features from snapshot
  const doorGroups = snapshot?.doorGroups ?? [];
  const compartmentExtrasValues = Object.values(
    snapshot?.compartmentExtras ?? {},
  );
  // Count drawers from BOTH sources:
  // 1. elementConfigs[key].drawerCounts (per-sub-column drawers)
  // 2. compartmentExtras[key].drawersCount (whole-compartment drawers)
  const elementConfigValues = Object.values(snapshot?.elementConfigs ?? {});
  const drawersFromConfigs = elementConfigValues.reduce(
    (sum: number, cfg: any) =>
      sum +
      (Array.isArray(cfg?.drawerCounts)
        ? cfg.drawerCounts.reduce((s: number, c: number) => s + (c ?? 0), 0)
        : 0),
    0,
  );
  const drawersFromExtras = compartmentExtrasValues.reduce(
    (sum: number, extras: any) => sum + (extras?.drawersCount ?? 0),
    0,
  );
  const drawerCount = drawersFromConfigs + drawersFromExtras;
  const rodCount = compartmentExtrasValues.filter(
    (extras: any) => extras?.rod === true,
  ).length;
  const ledCount = compartmentExtrasValues.filter(
    (extras: any) => extras?.led === true,
  ).length;
  const verticalDividerCount = elementConfigValues.filter(
    (cfg: any) => (cfg?.columns ?? 1) > 1,
  ).length;
  const shelfCount = computeShelfCount(snapshot);
  const columnCount = (snapshot?.verticalBoundaries?.length ?? 0) + 1;
  const hasMirror = doorGroups.some(
    (g: any) => g.type?.includes("Mirror") || g.type?.includes("mirror"),
  );

  // Compute door metrics (heights, type counts, handle info)
  const doorMetrics = computeDoorMetrics(snapshot, handlesWithFinishes);
  const doorCount =
    doorMetrics.singleDoorCount +
    doorMetrics.drawerStyleDoorCount +
    doorMetrics.doubleDoorCount * 2;
  const resolvedMaterialId = Number(snapshot?.selectedMaterialId ?? materialId);
  const resolvedFrontMaterialId = Number(
    snapshot?.selectedFrontMaterialId ?? frontMaterialId,
  );
  const resolvedBackMaterialIdRaw =
    snapshot?.selectedBackMaterialId ?? backMaterialId ?? null;
  const resolvedEdgeMaterialIdRaw =
    snapshot?.selectedEdgeMaterialId ?? edgeMaterialId ?? null;
  const resolvedFrontEdgeMaterialIdRaw =
    snapshot?.selectedFrontEdgeMaterialId ??
    frontEdgeMaterialId ??
    resolvedEdgeMaterialIdRaw ??
    null;
  const resolvedBackMaterialId =
    resolvedBackMaterialIdRaw != null
      ? Number(resolvedBackMaterialIdRaw)
      : null;
  const resolvedEdgeMaterialId =
    resolvedEdgeMaterialIdRaw != null
      ? Number(resolvedEdgeMaterialIdRaw)
      : null;
  const resolvedFrontEdgeMaterialId =
    resolvedFrontEdgeMaterialIdRaw != null
      ? Number(resolvedFrontEdgeMaterialIdRaw)
      : null;
  const pricingSnapshot = {
    width: Number(snapshot?.width ?? 0),
    height: Number(snapshot?.height ?? 0),
    depth: Number(snapshot?.depth ?? 0),
    selectedMaterialId: resolvedMaterialId,
    selectedFrontMaterialId: resolvedFrontMaterialId,
    selectedBackMaterialId: resolvedBackMaterialId,
    selectedEdgeMaterialId: resolvedEdgeMaterialId,
    selectedFrontEdgeMaterialId: resolvedFrontEdgeMaterialId,
    elementConfigs: snapshot?.elementConfigs ?? {},
    compartmentExtras: snapshot?.compartmentExtras ?? {},
    doorSelections: snapshot?.doorSelections ?? {},
    hasBase: Boolean(snapshot?.hasBase),
    baseHeight: Number(snapshot?.baseHeight ?? 0),
    verticalBoundaries: snapshot?.verticalBoundaries,
    columnHorizontalBoundaries: snapshot?.columnHorizontalBoundaries,
    columnHeights: snapshot?.columnHeights,
    columnModuleBoundaries: snapshot?.columnModuleBoundaries,
    columnTopModuleShelves: snapshot?.columnTopModuleShelves,
    doorGroups: snapshot?.doorGroups,
    globalHandleId: snapshot?.globalHandleId,
    globalHandleFinish: snapshot?.globalHandleFinish,
    doorSettingsMode: snapshot?.doorSettingsMode,
    selectedAccessories: snapshot?.selectedAccessories ?? {},
    slidingDoors: Boolean(snapshot?.slidingDoors),
  };
  const pricing = calculateCutList(
    pricingSnapshot,
    pricingMaterials,
    handlesWithFinishes,
    accessoriesWithVariants,
    enabledAccessoryRules,
  );
  const previewBaseTotal = Math.round(pricing.totalCost);
  const previewAreaM2 = pricing.totalArea;
  const boardCount = countBoardsExcludingShelvesAndBacks(pricing.items);
  const compartmentCount = computeCompartmentCount(snapshot);

  // Build rule context
  const ruleContext: RuleContext = {
    wardrobe: {
      width: Number(snapshot?.width ?? 0),
      height: Number(snapshot?.height ?? 0),
      depth: Number(snapshot?.depth ?? 0),
      area: previewAreaM2,
      columnCount,
      shelfCount,
      compartmentCount,
      doorCount,
      drawerCount,
      boardCount,
      hasBase: Boolean(snapshot?.hasBase),
      hasDoors: doorCount > 0,
      hasDrawers: drawerCount > 0,
      hasMirror,
      slidingDoors: Boolean(snapshot?.slidingDoors),
      hasRod: rodCount > 0,
      hasLed: ledCount > 0,
      hasVerticalDivider: verticalDividerCount > 0,
      rodCount,
      ledCount,
      verticalDividerCount,
      baseHeight: snapshot?.hasBase ? Number(snapshot?.baseHeight ?? 0) : 0,
      ...doorMetrics,
      material: {
        id: resolvedMaterialId,
        name: matMap.get(resolvedMaterialId) ?? "",
      },
      frontMaterial: {
        id: resolvedFrontMaterialId,
        name: matMap.get(resolvedFrontMaterialId) ?? "",
      },
      backMaterial: resolvedBackMaterialId
        ? {
            id: resolvedBackMaterialId,
            name: matMap.get(resolvedBackMaterialId) ?? "",
          }
        : undefined,
    },
    customer: {
      tags: input.customer.tags,
      email: input.customer.email,
      orderCount: input.customer.orderCount,
    },
    order: {
      total: previewBaseTotal,
      city:
        typeof shippingCity === "string" && shippingCity.length > 0
          ? shippingCity
          : undefined,
    },
  };

  const adjustments = applyRules(
    enabledRules as Rule[],
    ruleContext,
    previewBaseTotal,
  );
  const baseAdjustedTotal = calculateFinalPrice(previewBaseTotal, adjustments);
  const subtotalAfterRules =
    adjustments.length > 0 ? baseAdjustedTotal : previewBaseTotal;
  const normalizedInstallationService =
    typeof installationService === "string" &&
    isInstallationServiceType(installationService)
      ? installationService
      : undefined;
  const installationAdjustment = buildInstallationServiceAdjustment(
    subtotalAfterRules,
    normalizedInstallationService,
  );
  const combinedAdjustments = installationAdjustment
    ? [...adjustments, installationAdjustment]
    : adjustments;
  const visibleAdjustments = getVisibleAdjustments(combinedAdjustments);
  const adjustedTotal =
    combinedAdjustments.length > 0
      ? subtotalAfterRules + (installationAdjustment?.amount ?? 0)
      : previewBaseTotal;

  return {
    /** The cut list alone, before any rule. */
    baseTotal: previewBaseTotal,
    /** Null when no rule changed the price. */
    adjustedTotal: combinedAdjustments.length > 0 ? adjustedTotal : null,
    visibleAdjustments:
      visibleAdjustments.length > 0
        ? visibleAdjustments.map((a) => ({
            description: a.description,
            amount: a.amount,
          }))
        : null,
  };
}
