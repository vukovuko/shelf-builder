import { db } from "@/db/db";
import { orders, user, materials, wardrobes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  const allOrders = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      userName: user.name,
      userEmail: user.email,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      materialId: orders.materialId,
      materialName: materials.name,
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
    .orderBy(desc(orders.createdAt));

  const serializedOrders = allOrders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return <OrdersClient orders={serializedOrders} />;
}
