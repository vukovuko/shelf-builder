import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { orders, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { snapshotBoundsError } from "@/lib/snapshot-bounds";
import {
  checkRateLimit,
  getIdentifier,
  previewRateLimit,
} from "@/lib/upstash-rate-limit";
import {
  loadPricingCatalog,
  previewPrice,
} from "@/server/price-preview.server";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const limited = await checkRateLimit(
      previewRateLimit,
      session?.user?.id ?? getIdentifier(req),
    );
    if (limited) return limited;

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
      shippingCity,
      installationService,
    } = body;

    if (!snapshot || !materialId || !totalPrice) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (snapshotBoundsError(snapshot)) {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    }

    // Customer-specific pricing (order count, tags) only for a signed-in
    // customer: a typed email or phone proves nothing about who is asking.
    const previewUserId: string | null = session?.user?.id ?? null;

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

    const result = previewPrice(
      {
        snapshot,
        materialId,
        frontMaterialId,
        backMaterialId,
        edgeMaterialId,
        frontEdgeMaterialId,
        customer: {
          tags: userTags,
          email:
            (typeof customerEmail === "string" && customerEmail) ||
            session?.user?.email ||
            undefined,
          orderCount: previousOrderCount,
        },
        shippingCity,
        installationService,
      },
      await loadPricingCatalog(),
    );

    return NextResponse.json({
      adjustedTotal: result.adjustedTotal,
      visibleAdjustments: result.visibleAdjustments,
    });
  } catch (err) {
    console.error("[rules/preview]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
