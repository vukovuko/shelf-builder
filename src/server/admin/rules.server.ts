import { asc, count, eq, ilike } from "drizzle-orm";
import { db } from "@/db/db";
import { accessoryRules, rules } from "@/db/schema";
import { serializeRule } from "@/lib/accessory-rules/server";
import { requireAdmin } from "@/lib/roles";
import { type ListSearch, PAGE_SIZE, paging, withIsoDates } from "./paging";

export async function loadRules(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search ? ilike(rules.name, `%${search}%`) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(rules)
      .where(matching)
      .orderBy(asc(rules.priority), asc(rules.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(rules).where(matching),
  ]);

  return {
    rules: rows.map(withIsoDates),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

export async function loadRule(id: string) {
  await requireAdmin();
  const [rule] = await db.select().from(rules).where(eq(rules.id, id));
  return rule ? withIsoDates(rule) : null;
}

export async function loadAccessoryRules(input: ListSearch) {
  await requireAdmin();
  const { page, offset, search } = paging(input);
  const matching = search
    ? ilike(accessoryRules.name, `%${search}%`)
    : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(accessoryRules)
      .where(matching)
      .orderBy(asc(accessoryRules.priority), asc(accessoryRules.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(accessoryRules).where(matching),
  ]);

  return {
    rules: rows.map(serializeRule),
    page,
    pageSize: PAGE_SIZE,
    totalCount: Number(total?.count ?? 0),
    search,
  };
}

export async function loadAccessoryRule(id: string) {
  await requireAdmin();
  const [rule] = await db
    .select()
    .from(accessoryRules)
    .where(eq(accessoryRules.id, id));
  return rule ? serializeRule(rule) : null;
}
