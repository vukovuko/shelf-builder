import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { user, wardrobes, account, session, verification } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAdmin, getCurrentUser } from "@/lib/roles";
import { userIdSchema } from "@/lib/validation";

const userUpdateSchema = z.object({
  receiveOrderEmails: z.boolean().optional(),
  tags: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const validatedId = userIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Fetch user
    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, validatedId.data));

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch wardrobe count
    const [wardrobeCount] = await db
      .select({ count: count() })
      .from(wardrobes)
      .where(eq(wardrobes.userId, validatedId.data));

    // Fetch user's wardrobes
    const userWardrobes = await db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
      })
      .from(wardrobes)
      .where(eq(wardrobes.userId, validatedId.data));

    return NextResponse.json({
      ...userData,
      wardrobeCount: wardrobeCount?.count ?? 0,
      wardrobes: userWardrobes,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const validatedId = userIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = userUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { receiveOrderEmails, tags, notes } = validation.data;

    // Check if user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, validatedId.data));

    if (!existingUser) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 },
      );
    }

    // Update user
    await db
      .update(user)
      .set({
        ...(receiveOrderEmails !== undefined && { receiveOrderEmails }),
        ...(tags !== undefined && { tags }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      })
      .where(eq(user.id, validatedId.data));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const currentUser = await getCurrentUser();

    const { id } = await params;

    const validatedId = userIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Prevent self-deletion
    if (currentUser?.id === validatedId.data) {
      return NextResponse.json(
        { error: "Ne možete obrisati sami sebe" },
        { status: 400 },
      );
    }

    // Check if user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, validatedId.data));

    if (!existingUser) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 },
      );
    }

    // Delete related data in order (foreign key constraints)
    // 1. Delete sessions
    await db.delete(session).where(eq(session.userId, validatedId.data));

    // 2. Delete verifications
    await db
      .delete(verification)
      .where(eq(verification.identifier, validatedId.data));

    // 3. Delete accounts
    await db.delete(account).where(eq(account.userId, validatedId.data));

    // 4. Delete wardrobes
    await db.delete(wardrobes).where(eq(wardrobes.userId, validatedId.data));

    // 5. Delete user
    await db.delete(user).where(eq(user.id, validatedId.data));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
