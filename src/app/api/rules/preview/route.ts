import { NextResponse } from "next/server";
import { db } from "@/db/db";
import {
  user,
  orders,
  materials,
  rules,
  handles,
  handleFinishes,
} from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  applyRules,
  calculateFinalPrice,
  getVisibleAdjustments,
  computeDoorMetrics,
  type RuleContext,
  type Rule,
} from "@/lib/rules";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      wardrobeSnapshot: snapshot,
      materialId,
      frontMaterialId,
      backMaterialId,
      totalPrice,
      totalArea,
    } = body;

    if (!snapshot || !materialId || !totalPrice) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Look up material names
    const allMaterials = await db
      .select({ id: materials.id, name: materials.name })
      .from(materials);
    const matMap = new Map(allMaterials.map((m) => [Number(m.id), m.name]));

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
      })
      .from(handleFinishes);
    const handlesWithFinishes = pricingHandles.map((h) => ({
      ...h,
      finishes: allFinishes.filter((f) => f.handleId === h.id),
    }));

    // Count wardrobe features from snapshot
    const doorGroups = snapshot?.doorGroups ?? [];
    const doorCount = doorGroups.length;
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
    const bottomShelves = Object.values(
      snapshot?.columnHorizontalBoundaries ?? {},
    ).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );
    const topShelves = Object.values(
      snapshot?.columnTopModuleShelves ?? {},
    ).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );
    const shelfCount = bottomShelves + topShelves;
    const columnCount = (snapshot?.verticalBoundaries?.length ?? 0) + 1;
    const hasMirror = doorGroups.some(
      (g: any) => g.type?.includes("Mirror") || g.type?.includes("mirror"),
    );

    // Get user data for customer context
    const userId = session.user.id;
    const [orderCountResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.userId, userId));
    const previousOrderCount = Number(orderCountResult?.count ?? 0);

    const [userData] = await db
      .select({ tags: user.tags })
      .from(user)
      .where(eq(user.id, userId));
    const userTags: string[] = userData?.tags ? JSON.parse(userData.tags) : [];

    // Compute door metrics (heights, type counts, handle info)
    const doorMetrics = computeDoorMetrics(snapshot, handlesWithFinishes);

    // Build rule context
    const areaM2 = (totalArea ?? 0) / 10000;
    const ruleContext: RuleContext = {
      wardrobe: {
        width: Number(snapshot?.width ?? 0),
        height: Number(snapshot?.height ?? 0),
        depth: Number(snapshot?.depth ?? 0),
        area: areaM2,
        columnCount,
        shelfCount,
        doorCount,
        drawerCount,
        hasBase: Boolean(snapshot?.hasBase),
        hasDoors: doorCount > 0,
        hasDrawers: drawerCount > 0,
        hasMirror,
        hasRod: rodCount > 0,
        hasLed: ledCount > 0,
        hasVerticalDivider: verticalDividerCount > 0,
        rodCount,
        ledCount,
        verticalDividerCount,
        baseHeight: snapshot?.hasBase ? Number(snapshot?.baseHeight ?? 0) : 0,
        ...doorMetrics,
        material: {
          id: Number(materialId),
          name: matMap.get(Number(materialId)) ?? "",
        },
        frontMaterial: {
          id: Number(frontMaterialId),
          name: matMap.get(Number(frontMaterialId)) ?? "",
        },
        backMaterial: backMaterialId
          ? {
              id: Number(backMaterialId),
              name: matMap.get(Number(backMaterialId)) ?? "",
            }
          : undefined,
      },
      customer: {
        tags: userTags,
        email: session.user.email ?? undefined,
        orderCount: previousOrderCount,
      },
      order: {
        total: Math.round(totalPrice),
        city: undefined, // Not known yet at preview time
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
      Math.round(totalPrice),
    );
    const visibleAdjustments = getVisibleAdjustments(adjustments);
    const adjustedTotal = calculateFinalPrice(
      Math.round(totalPrice),
      adjustments,
    );

    return NextResponse.json({
      adjustedTotal: adjustments.length > 0 ? adjustedTotal : null,
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
