import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db/db";
import { materials, orders, user, wardrobes } from "@/db/schema";
import { auth } from "@/lib/auth";

// Every function here answers for the signed-in customer only and returns
// null when nobody is signed in; the account layout then shows the sign-in
// form instead of the page.

async function signedInUser(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
}

export async function listMyWardrobes(requestHeaders: Headers) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;
  return db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      thumbnail: wardrobes.thumbnail,
      isLocked: wardrobes.isLocked,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
    })
    .from(wardrobes)
    .where(eq(wardrobes.userId, me.id))
    .orderBy(desc(wardrobes.updatedAt));
}

export async function listMyOrders(requestHeaders: Headers) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;

  // Orders placed on this account, plus guest orders under the same email
  // once the email is verified. Phone numbers are self-set and unverified,
  // so they never grant access.
  const mine = [eq(orders.userId, me.id)];
  if (me.email && me.emailVerified) {
    mine.push(eq(orders.customerEmail, me.email));
  }

  return db
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
    .where(or(...mine))
    .orderBy(desc(orders.createdAt));
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

/** One order with its design, or null if it is not this customer's. */
export async function loadMyOrder(requestHeaders: Headers, id: string) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      shippingStreet: orders.shippingStreet,
      shippingApartment: orders.shippingApartment,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      materialName: materials.name,
      frontMaterialId: orders.frontMaterialId,
      backMaterialId: orders.backMaterialId,
      area: orders.area,
      totalPrice: orders.totalPrice,
      priceBreakdown: orders.priceBreakdown,
      ruleAdjustments: orders.ruleAdjustments,
      adjustedTotal: orders.adjustedTotal,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
    .leftJoin(materials, eq(orders.materialId, materials.id))
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return null;

  // Same rule as the orders list.
  const isMine =
    order.userId === me.id ||
    (me.emailVerified && order.customerEmail === me.email);
  if (!isMine) return null;

  const [frontMaterialName, backMaterialName, wardrobeData] = await Promise.all(
    [
      materialName(order.frontMaterialId),
      materialName(order.backMaterialId),
      wardrobeSnapshot(order.wardrobeId),
    ],
  );

  const edge = order.priceBreakdown?.edge;
  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingStreet: order.shippingStreet,
      shippingApartment: order.shippingApartment,
      shippingCity: order.shippingCity,
      shippingPostalCode: order.shippingPostalCode,
      wardrobeName: order.wardrobeName,
      materialName: order.materialName,
      frontMaterialName,
      backMaterialName,
      edgeMaterialName:
        edge?.materialName ??
        edge?.carcass?.materialName ??
        edge?.front?.materialName ??
        null,
      area: order.area,
      totalPrice: order.totalPrice,
      priceBreakdown: order.priceBreakdown,
      ruleAdjustments: order.ruleAdjustments,
      adjustedTotal: order.adjustedTotal,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      createdAt: order.createdAt.toISOString(),
    },
    wardrobeData,
  };
}

/**
 * Every material, for drawing an ordered design. Unpublished ones are
 * included: an old order may use a decor that is no longer sold.
 */
export async function listSceneMaterials(requestHeaders: Headers) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;
  const rows = await db.select().from(materials);
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    productCode: m.productCode,
    price: m.price,
    // Purchase prices stay on the server; customers only see selling prices.
    costPrice: 0,
    img: m.img,
    thickness: m.thickness,
    stock: m.stock,
    categories: m.categories,
    published: m.published,
  }));
}

export async function loadAccountSettings(requestHeaders: Headers) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;

  const [address] = await db
    .select({
      shippingStreet: user.shippingStreet,
      shippingApartment: user.shippingApartment,
      shippingCity: user.shippingCity,
      shippingPostalCode: user.shippingPostalCode,
      receiveNewsletter: user.receiveNewsletter,
    })
    .from(user)
    .where(eq(user.id, me.id));

  return {
    id: me.id,
    name: me.name,
    email: me.email,
    image: me.image,
    phone: me.phone,
    createdAt: me.createdAt,
    emailVerified: me.emailVerified,
    shippingStreet: address?.shippingStreet ?? null,
    shippingApartment: address?.shippingApartment ?? null,
    shippingCity: address?.shippingCity ?? null,
    shippingPostalCode: address?.shippingPostalCode ?? null,
    receiveNewsletter: address?.receiveNewsletter ?? false,
  };
}

/** What the account's contact form starts with: who is asking and their designs. */
export async function loadAccountContact(requestHeaders: Headers) {
  const me = await signedInUser(requestHeaders);
  if (!me) return null;

  const myDesigns = await db
    .select({ id: wardrobes.id, name: wardrobes.name })
    .from(wardrobes)
    .where(and(eq(wardrobes.userId, me.id), eq(wardrobes.isModel, false)))
    .orderBy(desc(wardrobes.updatedAt));

  return { wardrobes: myDesigns, userName: me.name, userEmail: me.email };
}
