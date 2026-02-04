import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { user, wardrobes, orders, materials, rules } from "@/db/schema";
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
  type RuleContext,
  type Rule,
} from "@/lib/rules";

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
    // Wardrobe data
    wardrobeSnapshot: z.record(z.string(), z.any()),
    thumbnail: z.string().nullable(),
    materialId: z.number(),
    frontMaterialId: z.number(),
    backMaterialId: z.number().nullable(),
    // area and totalPrice are computed server-side, ignored if sent
  })
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: "Morate uneti email ili telefon",
  });

export async function POST(request: Request) {
  try {
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
    } = validation.data;

    // Check if user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let userId: string;

    if (session?.user) {
      // User is logged in - use their ID
      userId = session.user.id;
    } else {
      // Guest checkout - create or find user
      const hasRealEmail = customerEmail && customerEmail.length > 0;
      const hasPhone = customerPhone && customerPhone.length > 0;

      if (hasRealEmail) {
        // Check if user with this email already exists
        const [existing] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, customerEmail));

        if (existing) {
          // Use existing user
          userId = existing.id;
        } else {
          // Create new user with email (no login capability)
          userId = crypto.randomUUID();
          const now = new Date();

          await db.insert(user).values({
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
        // Phone-only user
        const sanitizedPhone = customerPhone!.replace(/[^0-9]/g, "");
        const internalEmail = `phone.${sanitizedPhone}@internal.local`;

        // Check if user with this phone already exists
        const [existingByPhone] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.phone, customerPhone));

        if (existingByPhone) {
          userId = existingByPhone.id;
        } else {
          // Check by internal email too
          const [existingByEmail] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, internalEmail));

          if (existingByEmail) {
            userId = existingByEmail.id;
          } else {
            // Create new phone-only user
            userId = crypto.randomUUID();
            const now = new Date();

            await db.insert(user).values({
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
        return NextResponse.json(
          { error: "Morate uneti email ili telefon" },
          { status: 400 },
        );
      }
    }

    const pricingMaterials = await db
      .select({
        id: materials.id,
        name: materials.name,
        price: materials.price,
        thickness: materials.thickness,
        categories: materials.categories,
      })
      .from(materials);

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
    };

    const pricing = calculateCutList(pricingSnapshot, pricingMaterials);
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
    // RULE ENGINE: Apply pricing rules
    // =========================================================================

    // Count previous orders for this user
    const [orderCountResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.userId, userId));
    const previousOrderCount = Number(orderCountResult?.count ?? 0);

    // Get user tags if available
    const [userData] = await db
      .select({ tags: user.tags })
      .from(user)
      .where(eq(user.id, userId));
    const userTags: string[] = userData?.tags ? JSON.parse(userData.tags) : [];

    // Count wardrobe features
    const doorGroups = snapshot?.doorGroups ?? [];
    const doorCount = doorGroups.length;
    const drawerCount = Object.values(snapshot?.compartmentExtras ?? {}).reduce(
      (sum: number, extras: any) => sum + (extras?.drawersCount ?? 0),
      0,
    );
    const shelfCount = Object.values(
      snapshot?.columnHorizontalBoundaries ?? {},
    ).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    );
    const columnCount = (snapshot?.verticalBoundaries?.length ?? 0) + 1;

    // Check for mirrors
    const hasMirror = doorGroups.some(
      (g: any) => g.type?.includes("Mirror") || g.type?.includes("mirror"),
    );

    // Build rule context
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

    // Fetch enabled rules sorted by priority
    const enabledRules = await db
      .select()
      .from(rules)
      .where(eq(rules.enabled, true))
      .orderBy(asc(rules.priority), asc(rules.createdAt));

    // Apply rules
    const ruleAdjustments = applyRules(
      enabledRules as Rule[],
      ruleContext,
      totalPrice,
    );
    const adjustedTotal =
      ruleAdjustments.length > 0
        ? calculateFinalPrice(totalPrice, ruleAdjustments)
        : null;

    // Create wardrobe and order (manual rollback if order fails)
    const now = new Date();
    const wardrobeName = `Porudžbina - ${now.toLocaleDateString("sr-RS")}`;

    const [wardrobe] = await db
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

    // Create order - rollback wardrobe if this fails
    let order;
    try {
      [order] = await db
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
          // Rule engine adjustments
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
    } catch (orderError) {
      // Rollback: delete the wardrobe we just created
      await db.delete(wardrobes).where(eq(wardrobes.id, wardrobe.id));
      throw orderError;
    }

    // Update wardrobe name to include order number
    const finalWardrobeName = `Porudžbina #${order.orderNumber}`;
    await db
      .update(wardrobes)
      .set({ name: finalWardrobeName })
      .where(eq(wardrobes.id, wardrobe.id));

    // Update user's default shipping address (for future orders)
    await db
      .update(user)
      .set({
        shippingStreet,
        shippingApartment: shippingApartment || null,
        shippingCity,
        shippingPostalCode,
        phone: customerPhone || undefined, // Also update phone if provided
        updatedAt: now,
      })
      .where(eq(user.id, userId));

    const result = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      wardrobeId: wardrobe.id,
    };

    // Send emails (after transaction succeeds)
    // Rate limiter in email-rate-limiter.ts handles delays automatically
    // Use adjusted total for customer-facing price (if rules applied)
    const finalPrice = adjustedTotal ?? totalPrice;
    try {
      // Send customer confirmation if they provided email
      if (customerEmail && customerEmail.length > 0) {
        await sendOrderConfirmationEmail({
          to: customerEmail,
          orderNumber: result.orderNumber,
          customerName,
          totalPrice: finalPrice,
          shippingStreet,
          shippingCity,
          shippingPostalCode,
        });
      }

      // Send notification to all admins with receiveOrderEmails enabled
      await sendAdminNewOrderEmail({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
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

    return NextResponse.json(
      {
        success: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        wardrobeId: result.wardrobeId,
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
