import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { companySettings, materials } from "@/db/schema";
import {
  AGACIJA_INDEX_URL,
  AGACIJA_MIN_ITEMS,
  parseAgacijaIndex,
  planPriceSync,
} from "@/lib/agacija-prices";
import { updatePricesSql } from "@/lib/agacija-prices-sql";
import { requireAdmin } from "@/lib/roles";

// The fetch takes well under a second; this is headroom, not the norm.
export const maxDuration = 60;

const bodySchema = z.object({
  marginPercent: z.number().min(0).max(300),
  /** false: only show what would change. */
  apply: z.boolean(),
});

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
    return NextResponse.json({ error: "Neispravna marža" }, { status: 400 });
  }
  const { marginPercent, apply } = parsed.data;

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
    })
    .from(materials);
  const plan = planPriceSync(rows, index, marginPercent);

  if (apply) {
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
      `agacija-sync: ${plan.changes.length} prices updated, margin ${marginPercent}%`,
    );
  }

  return NextResponse.json({
    applied: apply,
    supplierItems: index.size,
    ...plan,
  });
}
