import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, ctx: any) {
  try {
    const raw = ctx?.params;
    const id = raw && typeof raw.then === 'function' ? (await raw)?.id : raw?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
    const w = await prisma.wardrobe.findFirst({
      where: { id, userId: (session.user as any).id }
    });
    if (!w) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
    const { name, data } = await req.json();
    await prisma.wardrobe.update({
      where: { id },
      data: { name, data: data || {} }
    });
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
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
    await prisma.wardrobe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/wardrobes/:id] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
