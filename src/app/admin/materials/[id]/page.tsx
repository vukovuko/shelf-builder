import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MaterialDetailClient } from "./MaterialDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MaterialDetailPage({ params }: PageProps) {
  const { id } = await params;
  const materialId = Number.parseInt(id, 10);

  if (Number.isNaN(materialId)) {
    notFound();
  }

  const [material] = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId));

  if (!material) {
    notFound();
  }

  const serializedMaterial = {
    ...material,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };

  return <MaterialDetailClient material={serializedMaterial} />;
}
