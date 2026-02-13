import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { orders, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { desc, eq, or } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

export default async function UserOrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Get user's phone for matching
  const [currentUser] = await db
    .select({ phone: user.phone })
    .from(user)
    .where(eq(user.id, session.user.id));

  // Query orders by:
  // 1. userId (orders made while logged in)
  // 2. customerEmail matching user's email (guest orders with same email)
  // 3. customerPhone matching user's phone (guest orders with same phone)
  const conditions = [eq(orders.userId, session.user.id)];

  if (session.user.email) {
    conditions.push(eq(orders.customerEmail, session.user.email));
  }

  if (currentUser?.phone) {
    conditions.push(eq(orders.customerPhone, currentUser.phone));
  }

  const userOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      totalPrice: orders.totalPrice,
      adjustedTotal: orders.adjustedTotal,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(or(...conditions))
    .orderBy(desc(orders.createdAt));

  return <OrdersClient orders={userOrders} />;
}
