import { NextResponse } from "next/server";
import { db } from "@/db/db";
import {
  user,
  orders,
  materials,
  rules,
  accessoryRules,
  handles,
  handleFinishes,
  accessories,
  accessoryVariants,
} from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  calculateCutList,
  countBoardsExcludingShelvesAndBacks,
} from "@/lib/calcCutList";
import {
  applyRules,
  calculateFinalPrice,
  computeCompartmentCount,
  computeShelfCount,
  getVisibleAdjustments,
  computeDoorMetrics,
  type RuleContext,
  type Rule,
} from "@/lib/rules";
import { buildInstallationServiceAdjustment } from "@/lib/installation-service";

// Preview route uses cut-list helpers directly to derive extra rule metrics.
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    const body = await req.json();
    const {
      wardrobeSnapshot: snapshot,
      materialId,
      frontMaterialId,
      backMaterialId,
      edgeMaterialId,
      frontEdgeMaterialId,
      totalPrice,
      totalArea,
      customerEmail,
      customerPhone,
      shippingCity,
      installationService,
    } = body;

    if (!snapshot || !materialId || !totalPrice) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Look up material names and pricing data needed for derived pricing and board counts
    const [pricingMaterials, enabledAccessoryRules] = await Promise.all([
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
    ]);
    const matMap = new Map(pricingMaterials.map((m) => [Number(m.id), m.name]));

    // Fetch handles for door metrics
    const pricingHandles = await db
      .select({
        id: handles.id,
        legacyId: handles.legacyId,
        name: handles.name,
      })
      .from(handles)
      .where(eq(handles.published, true));
    const allFinishes = await db
      .select({
        id: handleFinishes.id,
        handleId: handleFinishes.handleId,
        legacyId: handleFinishes.legacyId,
        name: handleFinishes.name,
        price: handleFinishes.price,
      })
      .from(handleFinishes);
    const pricingAccessories = await db
      .select({
        id: accessories.id,
        name: accessories.name,
        category: accessories.category,
        pricingRule: accessories.pricingRule,
        qtyPerUnit: accessories.qtyPerUnit,
      })
      .from(accessories)
      .where(eq(accessories.published, true));
    const allAccessoryVariants = await db
      .select({
        id: accessoryVariants.id,
        accessoryId: accessoryVariants.accessoryId,
        name: accessoryVariants.name,
        price: accessoryVariants.price,
      })
      .from(accessoryVariants);
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

    // Resolve customer context the same way checkout does, but read-only.
    let previewUserId: string | null = session?.user?.id ?? null;

    if (!previewUserId) {
      const hasRealEmail =
        typeof customerEmail === "string" && customerEmail.length > 0;
      const hasPhone =
        typeof customerPhone === "string" && customerPhone.length > 0;

      if (hasRealEmail) {
        const [existing] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, customerEmail));
        previewUserId = existing?.id ?? null;
      } else if (hasPhone) {
        const [existingByPhone] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.phone, customerPhone));

        if (existingByPhone) {
          previewUserId = existingByPhone.id;
        } else {
          const sanitizedPhone = customerPhone.replace(/[^0-9]/g, "");
          const internalEmail = `phone.${sanitizedPhone}@internal.local`;
          const [existingByEmail] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, internalEmail));
          previewUserId = existingByEmail?.id ?? null;
        }
      }
    }

    let previousOrderCount = 0;
    let userTags: string[] = [];

    if (previewUserId) {
      const [orderCountResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.userId, previewUserId));
      previousOrderCount = Number(orderCountResult?.count ?? 0);

      const [userData] = await db
        .select({ tags: user.tags })
        .from(user)
        .where(eq(user.id, previewUserId));
      userTags = userData?.tags ? JSON.parse(userData.tags) : [];
    }

    // Compute door metrics (heights, type counts, handle info)
    const doorMetrics = computeDoorMetrics(snapshot, handlesWithFinishes);
    const doorCount =
      doorMetrics.singleDoorCount +
      doorMetrics.drawerStyleDoorCount +
      doorMetrics.doubleDoorCount * 2;
    const resolvedMaterialId = Number(
      snapshot?.selectedMaterialId ?? materialId,
    );
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
        tags: userTags,
        email:
          (typeof customerEmail === "string" && customerEmail) ||
          session?.user?.email ||
          undefined,
        orderCount: previousOrderCount,
      },
      order: {
        total: previewBaseTotal,
        city:
          typeof shippingCity === "string" && shippingCity.length > 0
            ? shippingCity
            : undefined,
      },
    };

    // Fetch and apply rules
    const enabledRules = await db
      .select()
      .from(rules)
      .where(eq(rules.enabled, true))
      .orderBy(asc(rules.priority), asc(rules.createdAt));

    const adjustments = applyRules(
      enabledRules as Rule[],
      ruleContext,
      previewBaseTotal,
    );
    const baseAdjustedTotal = calculateFinalPrice(previewBaseTotal, adjustments);
    const subtotalAfterRules = adjustments.length > 0 ? baseAdjustedTotal : previewBaseTotal;
    const installationAdjustment = buildInstallationServiceAdjustment(
      subtotalAfterRules,
      typeof installationService === "string" ? installationService : "",
    );
    const combinedAdjustments = installationAdjustment
      ? [...adjustments, installationAdjustment]
      : adjustments;
    const visibleAdjustments = getVisibleAdjustments(combinedAdjustments);
    const adjustedTotal =
      combinedAdjustments.length > 0
        ? subtotalAfterRules + (installationAdjustment?.amount ?? 0)
        : previewBaseTotal;

    return NextResponse.json({
      adjustedTotal: combinedAdjustments.length > 0 ? adjustedTotal : null,
      visibleAdjustments:
        visibleAdjustments.length > 0
          ? visibleAdjustments.map((a) => ({
              description: a.description,
              amount: a.amount,
            }))
          : null,
    });
  } catch (err) {
    console.error("[rules/preview]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
