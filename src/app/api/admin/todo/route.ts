import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { todoLinks, todoNotes } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { adminErrorResponse, noteCreateSchema } from "@/lib/todo/api";

export async function GET() {
  try {
    await requireAdmin();
    const [notes, links] = await Promise.all([
      db.select().from(todoNotes).orderBy(asc(todoNotes.createdAt)),
      db.select().from(todoLinks),
    ]);
    return NextResponse.json({ notes, links });
  } catch (error) {
    return adminErrorResponse(error, "load");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = noteCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Neispravni podaci" }, { status: 400 });
    }
    const [note] = await db
      .insert(todoNotes)
      .values({ ...parsed.data, createdBy: admin.id })
      .returning();
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error, "create");
  }
}
