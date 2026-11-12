import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/db";
import {
  accessories,
  accessoryRules,
  accessoryVariants,
  handleFinishes,
  handles,
  materials,
} from "@/db/schema";
import { serializeRule } from "@/lib/accessory-rules/server";
import { auth } from "@/lib/auth";

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

/** Everything the configurator needs to start: who is signed in and the catalogs. */
export async function loadDesignerData(requestHeaders: Headers) {
  // One round of queries: the finishes and variants come in two flat queries
  // instead of one per handle/accessory (263 handles made this page ~4 s).
  const publishedHandleIds = db
    .select({ id: handles.id })
    .from(handles)
    .where(eq(handles.published, true));
  const publishedAccessoryIds = db
    .select({ id: accessories.id })
    .from(accessories)
    .where(eq(accessories.published, true));
  const [
    session,
    dbMaterials,
    dbHandles,
    dbFinishes,
    dbAccessories,
    dbVariants,
    dbAccessoryRules,
  ] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    db.select().from(materials).where(eq(materials.published, true)),
    db.select().from(handles).where(eq(handles.published, true)),
    db
      .select()
      .from(handleFinishes)
      .where(inArray(handleFinishes.handleId, publishedHandleIds)),
    db.select().from(accessories).where(eq(accessories.published, true)),
    db
      .select()
      .from(accessoryVariants)
      .where(inArray(accessoryVariants.accessoryId, publishedAccessoryIds)),
    db.select().from(accessoryRules).where(eq(accessoryRules.enabled, true)),
  ]);

  const isAdmin = session?.user?.role === "admin";
  // Purchase prices are business data: only admins get them.
  const cost = (value: number) => (isAdmin ? value : 0);

  // Only what the configurator shows of the signed-in user.
  const initialSession = session
    ? {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      }
    : null;

  const finishesByHandle = groupBy(dbFinishes, (f) => f.handleId);
  const variantsByAccessory = groupBy(dbVariants, (v) => v.accessoryId);

  return {
    initialSession,
    isAdmin,
    materials: dbMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      productCode: m.productCode,
      price: m.price,
      costPrice: cost(m.costPrice),
      img: m.img,
      thickness: m.thickness,
      stock: m.stock,
      categories: m.categories,
      published: m.published,
    })),
    handles: dbHandles.map((h) => ({
      id: h.id,
      legacyId: h.legacyId,
      name: h.name,
      description: h.description,
      mainImage: h.mainImage,
      published: h.published,
      finishes: (finishesByHandle.get(h.id) ?? []).map((f) => ({
        id: f.id,
        handleId: f.handleId,
        legacyId: f.legacyId,
        name: f.name,
        image: f.image,
        price: f.price,
        costPrice: cost(f.costPrice),
      })),
    })),
    accessories: dbAccessories.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      mainImage: a.mainImage,
      published: a.published,
      category: a.category,
      pricingRule: a.pricingRule,
      qtyPerUnit: a.qtyPerUnit,
      variants: (variantsByAccessory.get(a.id) ?? []).map((v) => ({
        id: v.id,
        accessoryId: v.accessoryId,
        name: v.name,
        image: v.image,
        price: v.price,
        costPrice: cost(v.costPrice),
      })),
    })),
    accessoryRules: dbAccessoryRules
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return left.createdAt.getTime() - right.createdAt.getTime();
      })
      .map(serializeRule),
  };
}
