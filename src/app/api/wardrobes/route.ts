import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes, materials } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createWardrobeSchema } from "@/lib/validation";
import { calculateCutList, type WardrobeSnapshot } from "@/lib/calcCutList";
import { isCurrentUserAdmin } from "@/lib/roles";
import {
  standardRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/upstash-rate-limit";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) return NextResponse.json([], { status: 200 });

    const list = await db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
      })
      .from(wardrobes)
      .where(
        and(
          eq(wardrobes.userId, session.user.id),
          eq(wardrobes.isModel, false),
        ),
      )
      .orderBy(desc(wardrobes.updatedAt));

    return NextResponse.json(list);
  } catch (e) {
    console.error("[GET /api/wardrobes] Internal error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit - 30 wardrobe saves per minute per IP
    const identifier = getIdentifier(req);
    const { success, reset } = await standardRateLimit.limit(identifier);
    if (!success) {
      return rateLimitResponse(reset);
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate input
    const validationResult = createWardrobeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validacija neuspešna",
          details: validationResult.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const { name, data, thumbnail, isModel } = validationResult.data;

    // Only admins can save as model
    if (isModel) {
      const userIsAdmin = await isCurrentUserAdmin();
      if (!userIsAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Calculate cut list if wardrobe data has required fields
    // Wrapped in try-catch to prevent save failures from cut list calculation errors
    let cutListData = null;
    if (
      data &&
      data.width &&
      data.height &&
      data.depth &&
      data.selectedMaterialId
    ) {
      try {
        // Fetch all materials for pricing
        const allMaterials = await db
          .select({
            id: materials.id,
            price: materials.price,
            thickness: materials.thickness,
            categories: materials.categories,
          })
          .from(materials);

        const snapshot: WardrobeSnapshot = {
          width: Number(data.width),
          height: Number(data.height),
          depth: Number(data.depth),
          selectedMaterialId: Number(data.selectedMaterialId),
          selectedFrontMaterialId: data.selectedFrontMaterialId
            ? Number(data.selectedFrontMaterialId)
            : null,
          selectedBackMaterialId: data.selectedBackMaterialId
            ? Number(data.selectedBackMaterialId)
            : null,
          elementConfigs:
            data.elementConfigs as WardrobeSnapshot["elementConfigs"],
          compartmentExtras:
            data.compartmentExtras as WardrobeSnapshot["compartmentExtras"],
          doorSelections:
            data.doorSelections as WardrobeSnapshot["doorSelections"],
          hasBase: Boolean(data.hasBase),
          baseHeight: Number(data.baseHeight ?? 0),
        };

        const pricing = calculateCutList(snapshot, allMaterials);

        // Get material prices for historical record
        const korpusMat = allMaterials.find(
          (m) => m.id === snapshot.selectedMaterialId,
        );
        const frontMat = allMaterials.find(
          (m) => m.id === snapshot.selectedFrontMaterialId,
        );
        const backMat = allMaterials.find(
          (m) => m.id === snapshot.selectedBackMaterialId,
        );

        // Filter out handles since they're not cut materials (accessories, not panels)
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
        cutListData = {
          items: pricing.items.filter(
            (
              item,
            ): item is typeof item & {
              materialType: "korpus" | "front" | "back";
            } => item.materialType !== "handles",
          ) as DbCutListItem[],
          pricePerM2: korpusMat?.price ?? 0,
          frontPricePerM2: frontMat?.price ?? 0,
          backPricePerM2: backMat?.price ?? 0,
          totalArea: pricing.totalArea,
          totalCost: pricing.totalCost,
        };
      } catch (cutListError) {
        // Log error but don't fail the save - wardrobe will be saved without cut list
        console.error(
          "[POST /api/wardrobes] Cut list calculation failed:",
          cutListError,
        );
        cutListData = null;
      }
    }

    const [created] = await db
      .insert(wardrobes)
      .values({
        name: name || "Orman",
        data: data || {},
        thumbnail: thumbnail || null,
        cutList: cutListData,
        userId: session.user.id,
        isModel: isModel || false,
      })
      .returning({ id: wardrobes.id });

    return NextResponse.json({ id: created.id });
  } catch (e) {
    console.error("[POST /api/wardrobes] Internal error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
