import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { accessories, accessoryVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccessoryDetailClient } from "./AccessoryDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccessoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const accessoryId = Number.parseInt(id, 10);

  if (Number.isNaN(accessoryId)) {
    notFound();
  }

  const [accessory] = await db
    .select()
    .from(accessories)
    .where(eq(accessories.id, accessoryId));

  if (!accessory) {
    notFound();
  }

  const variants = await db
    .select()
    .from(accessoryVariants)
    .where(eq(accessoryVariants.accessoryId, accessoryId));

  const serializedAccessory = {
    ...accessory,
    createdAt: accessory.createdAt.toISOString(),
    updatedAt: accessory.updatedAt.toISOString(),
    variants: variants.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  };

  return <AccessoryDetailClient accessory={serializedAccessory} />;
}
