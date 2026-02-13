import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import {
  user,
  wardrobes,
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
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
} from "@/lib/email";
import { calculateCutList } from "@/lib/calcCutList";
import {
  applyRules,
  calculateFinalPrice,
  computeDoorMetrics,
  type RuleContext,
  type Rule,
} from "@/lib/rules";
import {
  strictRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/upstash-rate-limit";
import {
  syncResendContact,
  addToCustomersSegment,
} from "@/lib/resend-contacts";

const checkoutSchema = z
  .object({
    // Customer info
    customerName: z.string().min(1, "Ime je obavezno"),
    customerEmail: z.string().email().optional().or(z.literal("")),
    customerPhone: z.string().min(6).optional().or(z.literal("")),
    // Shipping address
    shippingStreet: z.string().min(1, "Ulica je obavezna"),
    shippingApartment: z.string().optional().or(z.literal("")),
    shippingCity: z.string().min(1, "Grad je obavezan"),
    shippingPostalCode: z.string().min(1, "Poštanski broj je obavezan"),
    // Optional customer note
    notes: z.string().optional().or(z.literal("")),
    // Newsletter opt-in
    newsletter: z.boolean().optional(),
    // Wardrobe data
    wardrobeSnapshot: z.record(z.string(), z.any()),
    thumbnail: z.string().nullable(),
    materialId: z.number(),
    frontMaterialId: z.number(),
    backMaterialId: z.number().nullable(),
    // Turnstile CAPTCHA token
    turnstileToken: z.string().min(1, "Verifikacija je obavezna"),
    // area and totalPrice are computed server-side, ignored if sent
  })
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: "Morate uneti email ili telefon",
  });

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    },
  );
  const data = await response.json();
  return data.success === true;
}

export async function POST(request: Request) {
  try {
    // Rate limit - 5 checkout attempts per minute per IP
    const identifier = getIdentifier(request);
    const { success, reset } = await strictRateLimit.limit(identifier);
    if (!success) {
      return rateLimitResponse(reset);
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingStreet,
      shippingApartment,
      shippingCity,
      shippingPostalCode,
      notes,
      wardrobeSnapshot,
      thumbnail,
      materialId,
      frontMaterialId,
      backMaterialId,
      turnstileToken,
      newsletter,
    } = validation.data;

    // Verify Turnstile CAPTCHA token
    const isValidToken = await verifyTurnstileToken(turnstileToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Verifikacija nije uspela. Pokušajte ponovo." },
        { status: 400 },
      );
    }

    // Check if user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Pre-validate guest checkout has email or phone
    if (!session?.user) {
      const hasRealEmail = customerEmail && customerEmail.length > 0;
      const hasPhone = customerPhone && customerPhone.length > 0;
      if (!hasRealEmail && !hasPhone) {
        return NextResponse.json(
          { error: "Morate uneti email ili telefon" },
          { status: 400 },
        );
      }
    }

    // =========================================================================
    // PHASE A: Read-only data fetching + pricing (outside transaction)
    // =========================================================================

    const pricingMaterials = await db
      .select({
        id: materials.id,
        name: materials.name,
        price: materials.price,
        thickness: materials.thickness,
        categories: materials.categories,
      })
      .from(materials);

    // Fetch handles with finishes for pricing
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

    // Group finishes by handle
    const handlesWithFinishes = pricingHandles.map((h) => ({
      ...h,
      finishes: allFinishes.filter((f) => f.handleId === h.id),
    }));

    const snapshot = wardrobeSnapshot as Record<string, any>;
    const resolvedMaterialId = Number(
      snapshot?.selectedMaterialId ?? materialId,
    );
    const resolvedFrontMaterialId = Number(
      snapshot?.selectedFrontMaterialId ?? frontMaterialId,
    );
    const resolvedBackMaterialIdRaw =
      snapshot?.selectedBackMaterialId ?? backMaterialId ?? null;

    if (!Number.isFinite(resolvedMaterialId)) {
      return NextResponse.json(
        { error: "Nevažeći materijal za korpus" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(resolvedFrontMaterialId)) {
      return NextResponse.json(
        { error: "Nevažeći materijal za lica/vrata" },
        { status: 400 },
      );
    }

    const selectedMaterial = pricingMaterials.find(
      (m) => Number(m.id) === resolvedMaterialId,
    );
    if (!selectedMaterial) {
      return NextResponse.json(
        { error: "Nevažeći materijal za korpus" },
        { status: 400 },
      );
    }

    const selectedFrontMaterial = pricingMaterials.find(
      (m) => Number(m.id) === resolvedFrontMaterialId,
    );
    if (!selectedFrontMaterial) {
      return NextResponse.json(
        { error: "Nevažeći materijal za lica/vrata" },
        { status: 400 },
      );
    }

    const resolvedBackMaterialId =
      resolvedBackMaterialIdRaw != null &&
      pricingMaterials.some(
        (m) => Number(m.id) === Number(resolvedBackMaterialIdRaw),
      )
        ? Number(resolvedBackMaterialIdRaw)
        : null;

    if (resolvedBackMaterialId === null) {
      return NextResponse.json(
        { error: "Materijal za leđa je obavezan" },
        { status: 400 },
      );
    }

    const pricingSnapshot = {
      width: Number(snapshot?.width ?? 0),
      height: Number(snapshot?.height ?? 0),
      depth: Number(snapshot?.depth ?? 0),
      selectedMaterialId: resolvedMaterialId,
      selectedFrontMaterialId: resolvedFrontMaterialId,
      selectedBackMaterialId: resolvedBackMaterialId,
      elementConfigs: snapshot?.elementConfigs ?? {},
      compartmentExtras: snapshot?.compartmentExtras ?? {},
      doorSelections: snapshot?.doorSelections ?? {},
      hasBase: Boolean(snapshot?.hasBase),
      baseHeight: Number(snapshot?.baseHeight ?? 0),
      // Structural data for accurate calculations
      verticalBoundaries: snapshot?.verticalBoundaries,
      columnHorizontalBoundaries: snapshot?.columnHorizontalBoundaries,
      columnModuleBoundaries: snapshot?.columnModuleBoundaries,
      columnTopModuleShelves: snapshot?.columnTopModuleShelves,
      // Door groups with per-door settings
      doorGroups: snapshot?.doorGroups,
      globalHandleId: snapshot?.globalHandleId,
      globalHandleFinish: snapshot?.globalHandleFinish,
      doorSettingsMode: snapshot?.doorSettingsMode,
    };

    const pricing = calculateCutList(
      pricingSnapshot,
      pricingMaterials,
      handlesWithFinishes,
    );
    const totalPrice = Math.round(pricing.totalCost);
    const area = Math.round(pricing.totalArea * 10000);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0 || area <= 0) {
      return NextResponse.json(
        { error: "Greška pri kalkulaciji cene" },
        { status: 400 },
      );
    }

    // Get back material info for storing name
    const selectedBackMaterial = resolvedBackMaterialId
      ? pricingMaterials.find((m) => Number(m.id) === resolvedBackMaterialId)
      : null;

    // Use price breakdown calculated by calcCutList (based on materialType field)
    const priceBreakdown = {
      korpus: {
        areaM2: pricing.priceBreakdown.korpus.areaM2,
        price: pricing.priceBreakdown.korpus.price,
        materialName: selectedMaterial.name,
      },
      front: {
        areaM2: pricing.priceBreakdown.front.areaM2,
        price: pricing.priceBreakdown.front.price,
        materialName: selectedFrontMaterial.name,
      },
      back: {
        areaM2: pricing.priceBreakdown.back.areaM2,
        price: pricing.priceBreakdown.back.price,
        materialName: selectedBackMaterial?.name ?? "Nije izabrano",
      },
      handles: {
        count: pricing.priceBreakdown.handles.count,
        price: pricing.priceBreakdown.handles.price,
      },
    };

    // Build cut list data for storage (preserves prices at order time)
    // Filter out handles since they're not cut materials (stored in priceBreakdown instead)
    // Cast to database-compatible type (excludes "handles" from materialType)
    type DbCutListItem = {
      code: string;
      desc: string;
      widthCm: number;
      heightCm: number;
      thicknessMm: number;
      areaM2: number;
      cost: number;
      element: string;
      materialType: "korpus" | "front" | "back";
    };
    const cutListData = {
      items: pricing.items.filter(
        (
          item,
        ): item is typeof item & {
          materialType: "korpus" | "front" | "back";
        } => item.materialType !== "handles",
      ) as DbCutListItem[],
      pricePerM2: selectedMaterial.price,
      frontPricePerM2: selectedFrontMaterial.price,
      backPricePerM2: selectedBackMaterial?.price ?? 0,
    };

    // Cut list for wardrobe includes totals for quick display
    const wardrobeCutList = {
      ...cutListData,
      totalArea: pricing.totalArea,
      totalCost: pricing.totalCost,
    };

    // =========================================================================
    // RULE ENGINE: Build context (pure computation from snapshot)
    // =========================================================================

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

    const doorMetrics = computeDoorMetrics(snapshot, handlesWithFinishes);

    // =========================================================================
    // PHASE B: Transaction (all DB writes are atomic)
    // =========================================================================

    const txResult = await db.transaction(async (tx) => {
      // 1. Resolve userId (find or create guest user)
      let userId: string;

      if (session?.user) {
        userId = session.user.id;
      } else {
        const hasRealEmail = customerEmail && customerEmail.length > 0;
        const hasPhone = customerPhone && customerPhone.length > 0;

        if (hasRealEmail) {
          const [existing] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, customerEmail));

          if (existing) {
            userId = existing.id;
          } else {
            userId = crypto.randomUUID();
            const now = new Date();

            await tx.insert(user).values({
              id: userId,
              name: customerName,
              email: customerEmail,
              phone: hasPhone ? customerPhone : null,
              emailVerified: false,
              role: "user",
              createdAt: now,
              updatedAt: now,
            });
          }
        } else if (hasPhone) {
          const sanitizedPhone = customerPhone!.replace(/[^0-9]/g, "");
          const internalEmail = `phone.${sanitizedPhone}@internal.local`;

          const [existingByPhone] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.phone, customerPhone));

          if (existingByPhone) {
            userId = existingByPhone.id;
          } else {
            const [existingByEmail] = await tx
              .select({ id: user.id })
              .from(user)
              .where(eq(user.email, internalEmail));

            if (existingByEmail) {
              userId = existingByEmail.id;
            } else {
              userId = crypto.randomUUID();
              const now = new Date();

              await tx.insert(user).values({
                id: userId,
                name: customerName,
                email: internalEmail,
                phone: customerPhone,
                emailVerified: false,
                role: "user",
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        } else {
          throw new Error("Morate uneti email ili telefon");
        }
      }

      // 2. Fetch order count + user tags for rule engine
      const [orderCountResult] = await tx
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.userId, userId));
      const previousOrderCount = Number(orderCountResult?.count ?? 0);

      const [userData] = await tx
        .select({ tags: user.tags })
        .from(user)
        .where(eq(user.id, userId));
      const userTags: string[] = userData?.tags
        ? JSON.parse(userData.tags)
        : [];

      // 3. Build rule context + fetch and apply rules
      const ruleContext: RuleContext = {
        wardrobe: {
          width: pricingSnapshot.width,
          height: pricingSnapshot.height,
          depth: pricingSnapshot.depth,
          area: pricing.totalArea,
          columnCount,
          shelfCount,
          doorCount,
          drawerCount,
          hasBase: pricingSnapshot.hasBase,
          hasDoors: doorCount > 0,
          hasDrawers: drawerCount > 0,
          hasMirror,
          hasRod: rodCount > 0,
          hasLed: ledCount > 0,
          hasVerticalDivider: verticalDividerCount > 0,
          rodCount,
          ledCount,
          verticalDividerCount,
          baseHeight: pricingSnapshot.hasBase ? pricingSnapshot.baseHeight : 0,
          ...doorMetrics,
          material: {
            id: resolvedMaterialId,
            name: selectedMaterial.name,
          },
          frontMaterial: {
            id: resolvedFrontMaterialId,
            name: selectedFrontMaterial.name,
          },
          backMaterial: selectedBackMaterial
            ? {
                id: resolvedBackMaterialId!,
                name: selectedBackMaterial.name,
              }
            : undefined,
        },
        customer: {
          tags: userTags,
          email: customerEmail || undefined,
          orderCount: previousOrderCount,
        },
        order: {
          total: totalPrice,
          city: shippingCity,
        },
      };

      const enabledRules = await tx
        .select()
        .from(rules)
        .where(eq(rules.enabled, true))
        .orderBy(asc(rules.priority), asc(rules.createdAt));

      const ruleAdjustments = applyRules(
        enabledRules as Rule[],
        ruleContext,
        totalPrice,
      );
      const adjustedTotal =
        ruleAdjustments.length > 0
          ? calculateFinalPrice(totalPrice, ruleAdjustments)
          : null;

      // 4. Insert wardrobe
      const now = new Date();
      const wardrobeName = `Porudžbina - ${now.toLocaleDateString("sr-RS")}`;

      const [wardrobe] = await tx
        .insert(wardrobes)
        .values({
          name: wardrobeName,
          data: wardrobeSnapshot,
          thumbnail,
          cutList: wardrobeCutList,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: wardrobes.id });

      // 5. Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          wardrobeId: wardrobe.id,
          materialId: resolvedMaterialId,
          frontMaterialId: resolvedFrontMaterialId,
          backMaterialId: resolvedBackMaterialId,
          area,
          totalPrice,
          priceBreakdown,
          cutList: cutListData,
          customerName,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          shippingStreet,
          shippingApartment: shippingApartment || null,
          shippingCity,
          shippingPostalCode,
          notes: notes || null,
          ruleAdjustments: ruleAdjustments.length > 0 ? ruleAdjustments : null,
          adjustedTotal,
          status: "open",
          paymentStatus: "unpaid",
          fulfillmentStatus: "unfulfilled",
          returnStatus: "none",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 6. Update wardrobe name with order number
      const finalWardrobeName = `Porudžbina #${order.orderNumber}`;
      await tx
        .update(wardrobes)
        .set({ name: finalWardrobeName })
        .where(eq(wardrobes.id, wardrobe.id));

      // 7. Update user shipping address + newsletter preference
      await tx
        .update(user)
        .set({
          shippingStreet,
          shippingApartment: shippingApartment || null,
          shippingCity,
          shippingPostalCode,
          phone: customerPhone || undefined,
          ...(newsletter !== undefined && { receiveNewsletter: newsletter }),
          updatedAt: now,
        })
        .where(eq(user.id, userId));

      return {
        userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        wardrobeId: wardrobe.id,
        ruleAdjustments,
        adjustedTotal,
      };
    });

    // =========================================================================
    // PHASE C: Post-transaction (external calls, emails)
    // All Resend calls go through enqueueResend() — automatically serialized
    // with 600ms gaps. No manual delays needed.
    // =========================================================================

    // Visible adjustments for client display
    const visibleAdjustments = txResult.ruleAdjustments.filter(
      (adj) => adj.visible,
    );

    // Send emails (queue handles rate limiting automatically)
    const finalPrice = txResult.adjustedTotal ?? totalPrice;
    try {
      if (customerEmail && customerEmail.length > 0) {
        await sendOrderConfirmationEmail({
          to: customerEmail,
          orderNumber: txResult.orderNumber,
          customerName,
          totalPrice: finalPrice,
          basePrice: txResult.adjustedTotal ? totalPrice : undefined,
          adjustments:
            visibleAdjustments.length > 0 ? visibleAdjustments : undefined,
          shippingStreet,
          shippingCity,
          shippingPostalCode,
        });
      }

      await sendAdminNewOrderEmail({
        orderId: txResult.orderId,
        orderNumber: txResult.orderNumber,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        totalPrice: finalPrice,
        shippingStreet,
        shippingCity,
        shippingPostalCode,
      });
    } catch (emailError) {
      // Log but don't fail the order
      console.error("Failed to send emails:", emailError);
    }

    // Fire-and-forget contact syncs (queue serializes after emails)
    if (newsletter && customerEmail) {
      syncResendContact(customerEmail, customerName.split(" ")[0], true);
    }
    if (customerEmail) {
      addToCustomersSegment(customerEmail, customerName.split(" ")[0]);
    }

    return NextResponse.json(
      {
        success: true,
        orderId: txResult.orderId,
        orderNumber: txResult.orderNumber,
        wardrobeId: txResult.wardrobeId,
        adjustedTotal: txResult.adjustedTotal,
        visibleAdjustments:
          visibleAdjustments.length > 0 ? visibleAdjustments : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Checkout error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "Greška: duplikat podataka" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Greška pri obradi porudžbine" },
      { status: 500 },
    );
  }
}
