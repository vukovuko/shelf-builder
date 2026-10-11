import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { companySettings, materials } from "@/db/schema";
import {
  AGACIJA_INDEX_URL,
  AGACIJA_MIN_ITEMS,
  agacijaImageUrl,
  findNewProducts,
  parseAgacijaIndex,
  planPriceSync,
  priceWithMargin,
} from "@/lib/agacija-prices";
import { updatePricesSql } from "@/lib/agacija-prices-sql";
import {
  MATERIAL_CATEGORY_FRONT,
  MATERIAL_CATEGORY_KORPUS,
} from "@/lib/material-categories";
import { putR2Object } from "@/lib/r2";
import { requireAdmin } from "@/lib/roles";

// The Agacija fetch takes well under a second; this is headroom for copying
// images of newly added products.
export const maxDuration = 60;

const bodySchema = z.object({
  /** Global margin; materials with their own margin keep it. */
  marginPercent: z.number().int().min(0).max(300),
  action: z.enum(["preview", "apply-prices", "add-products"]),
  /** add-products: Agacija codes of the new products to add as drafts. */
  codes: z.array(z.string()).max(200).optional(),
});

/** Copies Agacija's photo to R2 (materials/<code>.jpg, like the catalog). */
async function copyImage(code: string): Promise<string | null> {
  try {
    const res = await fetch(agacijaImageUrl(code), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/"))
      return null;
    const body = new Uint8Array(await res.arrayBuffer());
    return await putR2Object(`materials/${code}.jpg`, body, "image/jpeg");
  } catch (error) {
    console.error(`agacija-sync: image ${code} not copied`, error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    const status =
      error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: "Nije dozvoljeno" }, { status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Marža mora biti ceo broj od 0 do 300" },
      { status: 400 },
    );
  }
  const { marginPercent, action, codes = [] } = parsed.data;

  let index: ReturnType<typeof parseAgacijaIndex>;
  try {
    const res = await fetch(AGACIJA_INDEX_URL, {
      headers: { Referer: "https://www.agacija.com/" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    index = parseAgacijaIndex(await res.json());
  } catch (error) {
    console.error("agacija-sync: fetch failed", error);
    index = new Map();
  }
  // A changed or failed response must never be read as "no prices".
  if (index.size < AGACIJA_MIN_ITEMS) {
    return NextResponse.json(
      { error: "Cenovnik sa Agacije nije učitan. Pokušajte ponovo kasnije." },
      { status: 502 },
    );
  }

  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      productCode: materials.productCode,
      price: materials.price,
      costPrice: materials.costPrice,
      marginPercent: materials.marginPercent,
    })
    .from(materials);
  const plan = planPriceSync(rows, index, marginPercent);
  let newProducts = findNewProducts(
    index,
    rows.map((r) => r.productCode),
  );
  let added = 0;

  if (action === "apply-prices") {
    await db.transaction(async (tx) => {
      if (plan.changes.length > 0) {
        await tx.execute(updatePricesSql(plan.changes));
      }
      await tx
        .insert(companySettings)
        .values({
          id: 1,
          materialMarginPercent: marginPercent,
          materialPricesSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: companySettings.id,
          set: {
            materialMarginPercent: marginPercent,
            materialPricesSyncedAt: new Date(),
          },
        });
    });
    console.log(
      `agacija-sync: ${plan.changes.length} prices updated, global margin ${marginPercent}%`,
    );
  }

  if (action === "add-products") {
    const wanted = new Set(codes);
    const toAdd = newProducts.filter((p) => wanted.has(p.code));
    // New products start as drafts: nobody sees them until they're published.
    for (const product of toAdd) {
      const cost = Math.round(product.price);
      await db.insert(materials).values({
        name: product.name,
        productCode: product.code,
        price: priceWithMargin(cost, marginPercent),
        costPrice: cost,
        img: await copyImage(product.code),
        thickness: product.thickness ?? 18,
        categories: [MATERIAL_CATEGORY_KORPUS, MATERIAL_CATEGORY_FRONT],
        published: false,
      });
      added++;
    }
    newProducts = newProducts.filter((p) => !wanted.has(p.code));
    console.log(`agacija-sync: ${added} new products added as drafts`);
  }

  return NextResponse.json({
    action,
    supplierItems: index.size,
    added,
    ...plan,
    newProducts: newProducts.map((p) => ({
      ...p,
      image: agacijaImageUrl(p.code),
    })),
  });
}
