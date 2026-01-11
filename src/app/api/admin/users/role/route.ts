import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, setUserRole, type Role } from "@/lib/roles";

// Zod schema for role update
const updateRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["user", "admin"], {
    message: "Role must be 'user' or 'admin'",
  }),
});

export async function PATCH(request: NextRequest) {
  try {
    // Check admin access and get current user
    const currentUser = await requireAdmin();

    // Parse and validate request body
    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { userId, role } = result.data;

    // Prevent self-role-change
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 },
      );
    }

    // Update role
    await setUserRole(userId, role as Role);

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
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
