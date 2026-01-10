import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(_req: Request, ctx: any) {
  try {
    const raw = ctx?.params;
    const id = raw && typeof raw.then === 'function' ? (await raw)?.id : raw?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
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
      .where(and(eq(wardrobes.id, id), eq(wardrobes.userId, session.user.id)))
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

export async function PUT(req: Request, ctx: any) {
  try {
    const raw = ctx?.params;
    const id = raw && typeof raw.then === 'function' ? (await raw)?.id : raw?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, data, thumbnail } = await req.json();

    await db
      .update(wardrobes)
      .set({ name, data: data || {}, thumbnail: thumbnail || null, updatedAt: new Date() })
      .where(and(eq(wardrobes.id, id), eq(wardrobes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: any) {
  try {
    const raw = ctx?.params;
    const id = raw && typeof raw.then === 'function' ? (await raw)?.id : raw?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .delete(wardrobes)
      .where(and(eq(wardrobes.id, id), eq(wardrobes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
