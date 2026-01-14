import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { desc } from "drizzle-orm";
import { MaterialsClient } from "./MaterialsClient";

export default async function MaterialsPage() {
	const allMaterials = await db
		.select()
		.from(materials)
		.orderBy(desc(materials.createdAt));

	const serializedMaterials = allMaterials.map((m) => ({
		...m,
		createdAt: m.createdAt.toISOString(),
		updatedAt: m.updatedAt.toISOString(),
	}));

	return <MaterialsClient materials={serializedMaterials} />;
}
