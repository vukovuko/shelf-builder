import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { user, wardrobes, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserDetailClient } from "./UserDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch user
  const [userData] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      receiveOrderEmails: user.receiveOrderEmails,
      tags: user.tags,
      notes: user.notes,
      shippingStreet: user.shippingStreet,
      shippingApartment: user.shippingApartment,
      shippingCity: user.shippingCity,
      shippingPostalCode: user.shippingPostalCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id));

  if (!userData) {
    notFound();
  }

  // Fetch user's wardrobes
  const userWardrobes = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
    })
    .from(wardrobes)
    .where(eq(wardrobes.userId, id));

  // Fetch user's orders (for stats and timeline)
  const userOrders = await db
    .select({
      id: orders.id,
      totalPrice: orders.totalPrice,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      shippingStreet: orders.shippingStreet,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt));

  // Calculate stats
  const totalSpent = userOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const orderCount = userOrders.length;

  const serializedUser = {
    ...userData,
    createdAt: userData.createdAt.toISOString(),
    updatedAt: userData.updatedAt.toISOString(),
    wardrobes: userWardrobes.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    orders: userOrders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
    totalSpent,
    orderCount,
  };

  return <UserDetailClient user={serializedUser} />;
}
