import { count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, user, wardrobes } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { type ListSearch, PAGE_SIZE, paging, withIsoDates } from "./paging";

export async function loadUsers(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search
    ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
    : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(matching)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(user).where(matching),
  ]);

  return {
    users: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

/** One customer with their designs and orders. */
export async function loadUser(id: string) {
  await requireAdmin();
  const [account, designs, placed] = await Promise.all([
    db
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
      .where(eq(user.id, id)),
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
      })
      .from(wardrobes)
      .where(eq(wardrobes.userId, id)),
    db
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
      .orderBy(desc(orders.createdAt)),
  ]);
  if (!account[0]) return null;

  return {
    ...withIsoDates(account[0]),
    wardrobes: designs.map(withIsoDates),
    orders: placed.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
    totalSpent: placed.reduce((sum, order) => sum + order.totalPrice, 0),
    orderCount: placed.length,
  };
}
