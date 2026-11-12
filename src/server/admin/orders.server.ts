import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { materials, orders, user, wardrobes } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { type ListSearch, PAGE_SIZE, paging, withIsoDates } from "./paging";
import { loadSceneCatalog } from "./scene.server";

export async function loadOrders(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search
    ? or(
        ilike(orders.customerName, `%${search}%`),
        ilike(orders.customerEmail, `%${search}%`),
        // The order number is an integer; ILIKE needs text.
        sql`${orders.orderNumber}::text ILIKE ${`%${search}%`}`,
      )
    : undefined;

  const [rows, [total]] = await Promise.all([
    db
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
      .where(matching)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(orders).where(matching),
  ]);

  return {
    orders: rows.map(withIsoDates),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

async function materialName(id: number | null) {
  if (!id) return null;
  const [row] = await db
    .select({ name: materials.name })
    .from(materials)
    .where(eq(materials.id, id))
    .limit(1);
  return row?.name ?? null;
}

async function wardrobeSnapshot(id: string | null) {
  if (!id) return null;
  const [row] = await db
    .select({ data: wardrobes.data })
    .from(wardrobes)
    .where(eq(wardrobes.id, id))
    .limit(1);
  return row?.data ?? null;
}

export async function loadOrder(id: string) {
  await requireAdmin();
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      // What the customer entered at checkout, not their profile.
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      shippingStreet: orders.shippingStreet,
      shippingApartment: orders.shippingApartment,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      wardrobeIsLocked: wardrobes.isLocked,
      materialId: orders.materialId,
      materialName: materials.name,
      frontMaterialId: orders.frontMaterialId,
      backMaterialId: orders.backMaterialId,
      area: orders.area,
      totalPrice: orders.totalPrice,
      priceBreakdown: orders.priceBreakdown,
      cutList: orders.cutList,
      ruleAdjustments: orders.ruleAdjustments,
      adjustedTotal: orders.adjustedTotal,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      returnStatus: orders.returnStatus,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
    .leftJoin(materials, eq(orders.materialId, materials.id))
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return null;

  const [frontMaterialName, backMaterialName, wardrobeData, scene] =
    await Promise.all([
      materialName(order.frontMaterialId),
      materialName(order.backMaterialId),
      wardrobeSnapshot(order.wardrobeId),
      loadSceneCatalog(),
    ]);

  const edge = order.priceBreakdown?.edge;
  return {
    order: {
      ...withIsoDates(order),
      frontMaterialName,
      backMaterialName,
      edgeMaterialName:
        edge?.materialName ??
        edge?.carcass?.materialName ??
        edge?.front?.materialName ??
        null,
    },
    wardrobeData,
    materials: scene.materials,
    accessoryRules: scene.accessoryRules,
  };
}

/** The pickers of the "new order" form. */
export async function loadNewOrderOptions() {
  await requireAdmin();
  const [users, allMaterials, allWardrobes] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user),
    db
      .select({
        id: materials.id,
        name: materials.name,
        categories: materials.categories,
      })
      .from(materials)
      .orderBy(materials.name),
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        userId: wardrobes.userId,
      })
      .from(wardrobes)
      .orderBy(desc(wardrobes.createdAt)),
  ]);
  return { users, materials: allMaterials, wardrobes: allWardrobes };
}
