import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, user, materials, wardrobes } from "@/db/schema";
import { OrderDetailClient } from "./OrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      userName: user.name,
      userEmail: user.email,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      materialId: orders.materialId,
      materialName: materials.name,
      backMaterialId: orders.backMaterialId,
      area: orders.area,
      totalPrice: orders.totalPrice,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      returnStatus: orders.returnStatus,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .leftJoin(user, eq(orders.userId, user.id))
    .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
    .leftJoin(materials, eq(orders.materialId, materials.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Get back material name if exists
  let backMaterialName: string | null = null;
  if (order.backMaterialId) {
    const [backMat] = await db
      .select({ name: materials.name })
      .from(materials)
      .where(eq(materials.id, order.backMaterialId))
      .limit(1);
    backMaterialName = backMat?.name ?? null;
  }

  return (
    <OrderDetailClient
      order={{
        ...order,
        backMaterialName,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }}
    />
  );
}
