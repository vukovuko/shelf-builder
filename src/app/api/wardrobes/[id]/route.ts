import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateWardrobeSchema, wardrobeIdSchema } from "@/lib/validation";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Nevažeći ID' }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [w] = await db
      .select()
      .from(wardrobes)
      .where(and(eq(wardrobes.id, idValidation.data), eq(wardrobes.userId, session.user.id)))
      .limit(1);

    if (!w) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(w);
  } catch (e) {
    console.error('[GET /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Nevažeći ID' }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate body
    const validationResult = updateWardrobeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validacija neuspešna',
          details: validationResult.error.issues[0].message
        },
        { status: 400 }
      );
    }

    const { name, data, thumbnail } = validationResult.data;

    await db
      .update(wardrobes)
      .set({
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data }),
        ...(thumbnail !== undefined && { thumbnail }),
        updatedAt: new Date()
      })
      .where(and(eq(wardrobes.id, idValidation.data), eq(wardrobes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Nevažeći ID' }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .delete(wardrobes)
      .where(and(eq(wardrobes.id, idValidation.data), eq(wardrobes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
