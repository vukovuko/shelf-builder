import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const settingsSchema = z.object({
  companyName: z.string().max(100),
  companyAddress: z.string().max(200),
  companyCity: z.string().max(100),
  companyPostalCode: z.string().max(10),
  pib: z.string().max(20),
  mb: z.string().max(20),
  bankAccount: z
    .string()
    .regex(/^\d{18}$/, "Račun mora imati tačno 18 cifara (bez crtica)"),
  paymentCode: z.string().regex(/^\d{3}$/, "Šifra plaćanja mora imati 3 cifre"),
  contactPhone: z.string().max(30),
  contactEmail: z.string().email("Neispravan email").or(z.literal("")),
});

export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.id, 1))
      .limit(1);

    if (rows.length === 0) {
      // Return empty defaults (row hasn't been created yet)
      return NextResponse.json({
        companyName: "",
        companyAddress: "",
        companyCity: "",
        companyPostalCode: "",
        pib: "",
        mb: "",
        bankAccount: "",
        paymentCode: "289",
        contactPhone: "",
        contactEmail: "",
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to get settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravni podaci" },
        { status: 400 },
      );
    }

    const data = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    // Upsert: try update first, insert if not exists
    const existing = await db
      .select({ id: companySettings.id })
      .from(companySettings)
      .where(eq(companySettings.id, 1))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(companySettings)
        .set(data)
        .where(eq(companySettings.id, 1));
    } else {
      await db.insert(companySettings).values({ id: 1, ...data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
