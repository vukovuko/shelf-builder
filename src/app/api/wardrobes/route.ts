import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json([], { status: 200 });
    const list = await prisma.wardrobe.findMany({
      where: { userId: (session.user as any).id },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('[GET /api/wardrobes] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Auth' }, { status: 401 });
    const { name, data } = await req.json();
    const created = await prisma.wardrobe.create({
      data: { name: name || 'Orman', data: data || {}, userId: (session.user as any).id }
    });
    return NextResponse.json({ id: created.id });
  } catch (e) {
    console.error('[POST /api/wardrobes] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
