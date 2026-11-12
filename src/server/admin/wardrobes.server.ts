import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, user, wardrobes } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { type ListSearch, PAGE_SIZE, paging, withIsoDates } from "./paging";
import { loadSceneCatalog } from "./scene.server";

// Designs are searched by their name or by their owner's name or email.
function ownedBy(search: string) {
  return search
    ? or(
        ilike(wardrobes.name, `%${search}%`),
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
      )
    : undefined;
}

export async function loadWardrobes(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = ownedBy(search);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
        userId: wardrobes.userId,
        userName: user.name,
        userEmail: user.email,
        isModel: wardrobes.isModel,
        isLocked: wardrobes.isLocked,
      })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(matching)
      .orderBy(desc(wardrobes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(matching),
  ]);

  return {
    wardrobes: rows.map(withIsoDates),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

/** Designs marked as models: the ready-made ones offered to customers. */
export async function loadModels(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = and(eq(wardrobes.isModel, true), ownedBy(search));

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
        userId: wardrobes.userId,
        userName: user.name,
        userEmail: user.email,
        publishedModel: wardrobes.publishedModel,
      })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(matching)
      .orderBy(desc(wardrobes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .where(matching),
  ]);

  return {
    models: rows.map(withIsoDates),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

/** One design with its owner, the orders that use it and the 3D catalog. */
export async function loadWardrobe(id: string) {
  await requireAdmin();
  const [wardrobe] = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      data: wardrobes.data,
      thumbnail: wardrobes.thumbnail,
      cutList: wardrobes.cutList,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
      userName: user.name,
      userEmail: user.email,
      isModel: wardrobes.isModel,
      isLocked: wardrobes.isLocked,
    })
    .from(wardrobes)
    .leftJoin(user, eq(wardrobes.userId, user.id))
    .where(eq(wardrobes.id, id))
    .limit(1);
  if (!wardrobe) return null;

  const [scene, linkedOrders] = await Promise.all([
    loadSceneCatalog(),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.wardrobeId, id)),
  ]);

  return {
    wardrobe: withIsoDates(wardrobe),
    materials: scene.materials,
    accessoryRules: scene.accessoryRules,
    linkedOrders,
  };
}
