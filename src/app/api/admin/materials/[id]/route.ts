import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const updateMaterialSchema = z.object({
	name: z.string().min(1).optional(),
	price: z.number().int().positive().optional(),
	category: z.string().min(1).optional(),
	img: z.string().nullable().optional(),
	thickness: z.number().int().positive().nullable().optional(),
	stock: z.number().int().min(0).optional(),
});

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireAdmin();

		const { id } = await params;
		const materialId = Number.parseInt(id, 10);

		if (Number.isNaN(materialId)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateMaterialSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.issues[0].message },
				{ status: 400 },
			);
		}

		const updates = validation.data;

		const [updated] = await db
			.update(materials)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(materials.id, materialId))
			.returning();

		if (!updated) {
			return NextResponse.json(
				{ error: "Material not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === "UNAUTHORIZED") {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}
			if (error.message === "FORBIDDEN") {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}
		console.error("Failed to update material:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireAdmin();

		const { id } = await params;
		const materialId = Number.parseInt(id, 10);

		if (Number.isNaN(materialId)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const [deleted] = await db
			.delete(materials)
			.where(eq(materials.id, materialId))
			.returning();

		if (!deleted) {
			return NextResponse.json(
				{ error: "Material not found" },
				{ status: 404 },
			);
		}

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
		console.error("Failed to delete material:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
