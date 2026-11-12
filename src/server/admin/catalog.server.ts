import { asc, count, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/db";
import {
  accessories,
  accessoryVariants,
  companySettings,
  handleFinishes,
  handles,
  materials,
} from "@/db/schema";
import { requireAdmin } from "@/lib/roles";
import { type ListSearch, PAGE_SIZE, paging, withIsoDates } from "./paging";

export async function loadMaterials(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search ? ilike(materials.name, `%${search}%`) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(materials)
      .where(matching)
      .orderBy(asc(materials.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(materials).where(matching),
  ]);

  return {
    materials: rows.map(withIsoDates),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

export async function loadMaterial(id: number) {
  await requireAdmin();
  const [material] = await db
    .select()
    .from(materials)
    .where(eq(materials.id, id));
  return material ? withIsoDates(material) : null;
}

export async function loadPriceSync() {
  await requireAdmin();
  const [settings] = await db
    .select({
      marginPercent: companySettings.materialMarginPercent,
      syncedAt: companySettings.materialPricesSyncedAt,
    })
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);

  return {
    initialMargin: settings?.marginPercent ?? 0,
    syncedAt: settings?.syncedAt?.toISOString() ?? null,
  };
}

// The finishes of a page of handles in one query, not one per handle.
async function finishesOf(handleIds: number[]) {
  if (handleIds.length === 0) return [];
  return db
    .select()
    .from(handleFinishes)
    .where(inArray(handleFinishes.handleId, handleIds));
}

export async function loadHandles(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search ? ilike(handles.name, `%${search}%`) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(handles)
      .where(matching)
      .orderBy(asc(handles.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(handles).where(matching),
  ]);
  const finishes = await finishesOf(rows.map((handle) => handle.id));

  return {
    handles: rows.map((handle) => ({
      ...withIsoDates(handle),
      finishes: finishes
        .filter((finish) => finish.handleId === handle.id)
        .map(withIsoDates),
    })),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

export async function loadHandle(id: number) {
  await requireAdmin();
  const [handle] = await db.select().from(handles).where(eq(handles.id, id));
  if (!handle) return null;
  const finishes = await finishesOf([id]);
  return { ...withIsoDates(handle), finishes: finishes.map(withIsoDates) };
}

async function variantsOf(accessoryIds: number[]) {
  if (accessoryIds.length === 0) return [];
  return db
    .select()
    .from(accessoryVariants)
    .where(inArray(accessoryVariants.accessoryId, accessoryIds));
}

export async function loadAccessories(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search ? ilike(accessories.name, `%${search}%`) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(accessories)
      .where(matching)
      .orderBy(asc(accessories.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(accessories).where(matching),
  ]);
  const variants = await variantsOf(rows.map((accessory) => accessory.id));

  return {
    accessories: rows.map((accessory) => ({
      ...withIsoDates(accessory),
      variants: variants
        .filter((variant) => variant.accessoryId === accessory.id)
        .map(withIsoDates),
    })),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

export async function loadAccessory(id: number) {
  await requireAdmin();
  const [accessory] = await db
    .select()
    .from(accessories)
    .where(eq(accessories.id, id));
  if (!accessory) return null;
  const variants = await variantsOf([id]);
  return { ...withIsoDates(accessory), variants: variants.map(withIsoDates) };
}
