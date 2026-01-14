import { db } from "@/db/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  const allOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));

  const serializedOrders = allOrders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return <OrdersClient orders={serializedOrders} />;
}
