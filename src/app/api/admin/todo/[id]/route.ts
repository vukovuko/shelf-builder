import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { todoNotes } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { adminErrorResponse, notePatchSchema } from "@/lib/todo/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = notePatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Neispravni podaci" }, { status: 400 });
    }
    const [note] = await db
      .update(todoNotes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(todoNotes.id, id))
      .returning();
    if (!note) {
      return NextResponse.json({ error: "Nije pronađeno" }, { status: 404 });
    }
    return NextResponse.json(note);
  } catch (error) {
    return adminErrorResponse(error, "update");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    // Arrows to and from the note go with it (ON DELETE CASCADE).
    await db.delete(todoNotes).where(eq(todoNotes.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error, "delete");
  }
}
