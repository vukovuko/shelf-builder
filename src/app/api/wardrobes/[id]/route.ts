import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js 15 may provide params as a promise; support both signature styles by awaiting context.params
type ParamsPromise = { params: Promise<{ id: string }> } | { params: { id: string } };

async function resolveId(context: ParamsPromise): Promise<string | undefined> {
  const raw: any = (context as any).params;
  if (raw && typeof raw.then === 'function') {
    const awaited = await raw;
    return awaited?.id;
  }
  return raw?.id;
}

export async function GET(req: Request, context: ParamsPromise) {
  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
  const w = await prisma.wardrobe.findFirst({
    where: { id, userId: (session.user as any).id }
  });
  if (!w) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(w);
}

export async function PUT(req: Request, context: ParamsPromise) {
  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
  const { name, data } = await req.json();
  await prisma.wardrobe.update({
    where: { id },
    data: { name, data: data || {} }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, context: ParamsPromise) {
  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
  await prisma.wardrobe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
