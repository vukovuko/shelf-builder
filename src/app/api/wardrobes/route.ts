import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) return NextResponse.json([], { status: 200 });

    const list = await db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt
      })
      .from(wardrobes)
      .where(eq(wardrobes.userId, session.user.id))
      .orderBy(desc(wardrobes.updatedAt));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[GET /api/wardrobes] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, data, thumbnail } = await req.json();

    const [created] = await db
      .insert(wardrobes)
      .values({
        name: name || 'Orman',
        data: data || {},
        thumbnail: thumbnail || null,
        userId: session.user.id
      })
      .returning({ id: wardrobes.id });

    return NextResponse.json({ id: created.id });
  } catch (e) {
    console.error('[POST /api/wardrobes] Internal error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
