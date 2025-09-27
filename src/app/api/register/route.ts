import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Missing' }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Email exists' }, { status: 409 });
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, password: hash } });
  return NextResponse.json({ ok: true });
}
