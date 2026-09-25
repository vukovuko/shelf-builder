import { desc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/db";
import { orders } from "@/db/schema";
import { auth } from "@/lib/auth";
import { OrdersClient } from "./OrdersClient";

export default async function UserOrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null; // the layout shows the sign-in form

  // Orders placed on this account, plus guest orders under the same email
  // once the email is verified. Phone numbers are self-set and unverified,
  // so they never grant access.
  const conditions = [eq(orders.userId, session.user.id)];

  if (session.user.email && session.user.emailVerified) {
    conditions.push(eq(orders.customerEmail, session.user.email));
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
