import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { todoLinks } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { adminErrorResponse, linkCreateSchema } from "@/lib/todo/api";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const parsed = linkCreateSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.sourceId === parsed.data.targetId) {
      return NextResponse.json({ error: "Neispravni podaci" }, { status: 400 });
    }
    const [link] = await db.insert(todoLinks).values(parsed.data).returning();
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error, "link");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Neispravni podaci" }, { status: 400 });
    }
    await db.delete(todoLinks).where(eq(todoLinks.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error, "unlink");
  }
}
