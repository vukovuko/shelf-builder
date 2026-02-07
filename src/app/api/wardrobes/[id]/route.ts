import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isCurrentUserAdmin } from "@/lib/roles";
import { updateWardrobeSchema, wardrobeIdSchema } from "@/lib/validation";
import {
  standardRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/upstash-rate-limit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Nevažeći ID" }, { status: 400 });
    }

    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session) {
      // Debug: log to understand why session is null
      const cookie = reqHeaders.get("cookie");
      console.error(
        "[GET /api/wardrobes/:id] No session found. Cookie present:",
        !!cookie,
        "Cookie length:",
        cookie?.length ?? 0,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin - admins can fetch any wardrobe
    const userIsAdmin = await isCurrentUserAdmin();

    // Build where clause - admin can fetch any wardrobe, user only their own
    const whereClause = userIsAdmin
      ? eq(wardrobes.id, idValidation.data)
      : and(
          eq(wardrobes.id, idValidation.data),
          eq(wardrobes.userId, session.user.id),
        );

    const [w] = await db.select().from(wardrobes).where(whereClause).limit(1);

    if (!w) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(w);
  } catch (e) {
    console.error("[GET /api/wardrobes/:id] Internal error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    // Rate limit - 30 wardrobe updates per minute per IP
    const identifier = getIdentifier(req);
    const { success, reset } = await standardRateLimit.limit(identifier);
    if (!success) {
      return rateLimitResponse(reset);
    }

    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Nevažeći ID" }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate body
    const validationResult = updateWardrobeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validacija neuspešna",
          details: validationResult.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const { name, data, thumbnail } = validationResult.data;

    // Check if wardrobe is locked
    const [existing] = await db
      .select({ isLocked: wardrobes.isLocked })
      .from(wardrobes)
      .where(eq(wardrobes.id, idValidation.data))
      .limit(1);
    if (existing?.isLocked) {
      return NextResponse.json(
        { error: "Orman je zaključan i ne može se menjati." },
        { status: 403 },
      );
    }

    // Check if user is admin - admins can update any wardrobe
    const userIsAdmin = await isCurrentUserAdmin();

    // Build where clause - admin can update any wardrobe, user only their own
    const whereClause = userIsAdmin
      ? eq(wardrobes.id, idValidation.data)
      : and(
          eq(wardrobes.id, idValidation.data),
          eq(wardrobes.userId, session.user.id),
        );

    await db
      .update(wardrobes)
      .set({
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data }),
        ...(thumbnail !== undefined && { thumbnail }),
        updatedAt: new Date(),
      })
      .where(whereClause);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT /api/wardrobes/:id] Internal error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const raw = ctx?.params;
    const id = raw instanceof Promise ? (await raw).id : raw.id;

    // Validate ID
    const idValidation = wardrobeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Nevažeći ID" }, { status: 400 });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if wardrobe is locked
    const [existing] = await db
      .select({ isLocked: wardrobes.isLocked })
      .from(wardrobes)
      .where(eq(wardrobes.id, idValidation.data))
      .limit(1);
    if (existing?.isLocked) {
      return NextResponse.json(
        { error: "Orman je zaključan i ne može se obrisati." },
        { status: 403 },
      );
    }

    await db
      .delete(wardrobes)
      .where(
        and(
          eq(wardrobes.id, idValidation.data),
          eq(wardrobes.userId, session.user.id),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/wardrobes/:id] Internal error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
