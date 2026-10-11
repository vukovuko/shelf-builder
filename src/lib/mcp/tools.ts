import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import {
  contactMessages,
  fulfillmentStatusEnum,
  handleFinishes,
  handles,
  materials,
  orderStatusEnum,
  orders,
  paymentStatusEnum,
  todoNotes,
  user,
  wardrobes,
} from "@/db/schema";
import {
  AGACIJA_INDEX_URL,
  AGACIJA_MIN_ITEMS,
  findNewProducts,
  parseAgacijaIndex,
  planPriceSync,
} from "@/lib/agacija-prices";
import { materialKind, materialSlug } from "@/lib/material-pages";

const SITE = process.env.BETTER_AUTH_URL ?? "https://ormanipomeri.com";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }],
  };
}

/** YYYY-MM-DD → start of that day; the "to" side covers the whole day. */
function day(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setDate(date.getDate() + 1);
  return date;
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("YYYY-MM-DD");

const orderTotal = sql<number>`coalesce(${orders.adjustedTotal}, ${orders.totalPrice})`;

/**
 * Read-only tools over the admin data. Lists leave out phone numbers and
 * street addresses; get_order and get_customer return them for one record.
 */
export function registerAdminTools(server: McpServer) {
  server.registerTool(
    "list_orders",
    {
      title: "List orders",
      description:
        "Orders, newest first: number, date, customer name and city, total in RSD and statuses. Filter by status, date range or a customer name. No contact details; use get_order for one order.",
      inputSchema: z.object({
        status: z.enum(orderStatusEnum.enumValues).optional(),
        paymentStatus: z.enum(paymentStatusEnum.enumValues).optional(),
        fulfillmentStatus: z.enum(fulfillmentStatusEnum.enumValues).optional(),
        from: dateString.optional(),
        to: dateString.optional(),
        customer: z.string().max(100).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      const where = and(
        args.status ? eq(orders.status, args.status) : undefined,
        args.paymentStatus
          ? eq(orders.paymentStatus, args.paymentStatus)
          : undefined,
        args.fulfillmentStatus
          ? eq(orders.fulfillmentStatus, args.fulfillmentStatus)
          : undefined,
        args.from ? gte(orders.createdAt, day(args.from) as Date) : undefined,
        args.to ? lte(orders.createdAt, day(args.to, true) as Date) : undefined,
        args.customer
          ? ilike(orders.customerName, `%${args.customer}%`)
          : undefined,
      );
      const rows = await db
        .select({
          orderNumber: orders.orderNumber,
          createdAt: orders.createdAt,
          customerName: orders.customerName,
          city: orders.shippingCity,
          totalRsd: orderTotal,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          fulfillmentStatus: orders.fulfillmentStatus,
        })
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(args.limit);
      return json(rows);
    },
  );

  server.registerTool(
    "get_order",
    {
      title: "Get order",
      description:
        "One order by its number: customer contact and delivery address, statuses, notes, materials, price breakdown, rule adjustments and a link to it in the admin.",
      inputSchema: z.object({ orderNumber: z.number().int().positive() }),
      annotations: READ_ONLY,
    },
    async ({ orderNumber }) => {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      if (!order) return json({ error: `No order #${orderNumber}` });
      const materialIds = [
        order.materialId,
        order.frontMaterialId,
        order.backMaterialId,
      ].filter((id): id is number => id !== null);
      const mats = await db
        .select({ id: materials.id, name: materials.name })
        .from(materials)
        .where(inArray(materials.id, materialIds));
      const name = (id: number | null) =>
        mats.find((m) => m.id === id)?.name ?? null;
      const [design] = order.wardrobeId
        ? await db
            .select({ name: wardrobes.name })
            .from(wardrobes)
            .where(eq(wardrobes.id, order.wardrobeId))
        : [];
      const { cutList, ...rest } = order;
      return json({
        ...rest,
        totalRsd: order.adjustedTotal ?? order.totalPrice,
        areaM2: order.area / 10_000,
        materials: {
          korpus: name(order.materialId),
          front: name(order.frontMaterialId),
          back: name(order.backMaterialId),
        },
        design: design?.name ?? null,
        boards: cutList?.items.length ?? 0,
        adminUrl: `${SITE}/admin/orders/${order.id}`,
      });
    },
  );

  server.registerTool(
    "search_customers",
    {
      title: "Search customers",
      description:
        "Customer accounts by name, email or phone (part of it is enough), newest first, with their order count. No phone or address; use get_customer for one person.",
      inputSchema: z.object({
        query: z.string().max(100).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, limit }) => {
      const q = query ? `%${query}%` : undefined;
      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          orders: sql<number>`(select count(*)::int from "order" o where o."userId" = ${user.id})`,
        })
        .from(user)
        .where(
          q
            ? or(
                ilike(user.name, q),
                ilike(user.email, q),
                ilike(user.phone, q),
              )
            : undefined,
        )
        .orderBy(desc(user.createdAt))
        .limit(limit);
      return json(rows);
    },
  );

  server.registerTool(
    "get_customer",
    {
      title: "Get customer",
      description:
        "One customer by id or email: contact details, address, tags, admin notes, their orders and how many designs they saved.",
      inputSchema: z.object({
        id: z.string().optional(),
        email: z.string().optional(),
      }),
      annotations: READ_ONLY,
    },
    async ({ id, email }) => {
      if (!id && !email) return json({ error: "Give an id or an email" });
      const [person] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          phone: user.phone,
          role: user.role,
          banned: user.banned,
          tags: user.tags,
          notes: user.notes,
          receiveNewsletter: user.receiveNewsletter,
          shippingStreet: user.shippingStreet,
          shippingApartment: user.shippingApartment,
          shippingCity: user.shippingCity,
          shippingPostalCode: user.shippingPostalCode,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(id ? eq(user.id, id) : eq(user.email, email as string))
        .limit(1);
      if (!person) return json({ error: "No such customer" });
      const [customerOrders, [designs]] = await Promise.all([
        db
          .select({
            orderNumber: orders.orderNumber,
            createdAt: orders.createdAt,
            totalRsd: orderTotal,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            fulfillmentStatus: orders.fulfillmentStatus,
          })
          .from(orders)
          .where(eq(orders.userId, person.id))
          .orderBy(desc(orders.createdAt)),
        db
          .select({ n: count() })
          .from(wardrobes)
          .where(eq(wardrobes.userId, person.id)),
      ]);
      return json({
        ...person,
        orders: customerOrders,
        savedDesigns: designs?.n ?? 0,
      });
    },
  );

  server.registerTool(
    "list_materials",
    {
      title: "List materials",
      description:
        "Board decors and backs: id, supplier name, code, sale and purchase price per m² (RSD), own margin (null = global), published or draft, popularity rank. Filter by name or code.",
      inputSchema: z.object({
        query: z.string().max(100).optional(),
        published: z.boolean().optional(),
        limit: z.number().int().min(1).max(600).default(50),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, published, limit }) => {
      const q = query ? `%${query}%` : undefined;
      const rows = await db
        .select({
          id: materials.id,
          name: materials.name,
          code: materials.productCode,
          priceRsdM2: materials.price,
          costRsdM2: materials.costPrice,
          marginPercent: materials.marginPercent,
          published: materials.published,
          thickness: materials.thickness,
          popularRank: materials.popularRank,
        })
        .from(materials)
        .where(
          and(
            q
              ? or(ilike(materials.name, q), ilike(materials.productCode, q))
              : undefined,
            published === undefined
              ? undefined
              : eq(materials.published, published),
          ),
        )
        .orderBy(materials.name)
        .limit(limit);
      return json(rows);
    },
  );

  server.registerTool(
    "get_material",
    {
      title: "Get material",
      description:
        "One material by id or code: everything in the admin form, plus its public page and admin links.",
      inputSchema: z.object({
        id: z.number().int().optional(),
        code: z.string().optional(),
      }),
      annotations: READ_ONLY,
    },
    async ({ id, code }) => {
      if (!id && !code) return json({ error: "Give an id or a code" });
      const [material] = await db
        .select({
          id: materials.id,
          name: materials.name,
          productCode: materials.productCode,
          price: materials.price,
          costPrice: materials.costPrice,
          marginPercent: materials.marginPercent,
          img: materials.img,
          thickness: materials.thickness,
          categories: materials.categories,
          published: materials.published,
          description: materials.description,
          popularRank: materials.popularRank,
          updatedAt: materials.updatedAt,
        })
        .from(materials)
        .where(
          id ? eq(materials.id, id) : ilike(materials.productCode, code ?? ""),
        )
        .limit(1);
      if (!material) return json({ error: "No such material" });
      return json({
        ...material,
        publicUrl:
          material.published && materialKind(material)
            ? `${SITE}/materijali/${materialSlug(material)}`
            : null,
        adminUrl: `${SITE}/admin/materials/${material.id}`,
      });
    },
  );

  server.registerTool(
    "list_handles",
    {
      title: "List handles",
      description:
        "Published handles and knobs with their finishes and price per piece (RSD). Filter by part of the supplier name (e.g. K785, 160).",
      inputSchema: z.object({ query: z.string().max(100).optional() }),
      annotations: READ_ONLY,
    },
    async ({ query }) => {
      const rows = await db
        .select({
          id: handles.id,
          name: handles.name,
          description: handles.description,
          finish: handleFinishes.name,
          priceRsd: handleFinishes.price,
        })
        .from(handles)
        .leftJoin(handleFinishes, eq(handleFinishes.handleId, handles.id))
        .where(
          and(
            eq(handles.published, true),
            query ? ilike(handles.name, `%${query}%`) : undefined,
          ),
        )
        .orderBy(handles.name)
        .limit(300);
      return json(rows);
    },
  );

  server.registerTool(
    "list_saved_designs",
    {
      title: "List saved designs",
      description:
        "Wardrobes customers saved in the configurator (or the shop's own models), newest first: name, owner, outer size in cm, date.",
      inputSchema: z.object({
        modelsOnly: z.boolean().default(false),
        customerEmail: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: READ_ONLY,
    },
    async ({ modelsOnly, customerEmail, limit }) => {
      const rows = await db
        .select({
          id: wardrobes.id,
          name: wardrobes.name,
          owner: user.name,
          ownerEmail: user.email,
          isModel: wardrobes.isModel,
          widthCm: sql<number>`(${wardrobes.data}->>'width')::float`,
          heightCm: sql<number>`(${wardrobes.data}->>'height')::float`,
          depthCm: sql<number>`(${wardrobes.data}->>'depth')::float`,
          createdAt: wardrobes.createdAt,
        })
        .from(wardrobes)
        .leftJoin(user, eq(user.id, wardrobes.userId))
        .where(
          and(
            modelsOnly ? eq(wardrobes.isModel, true) : undefined,
            customerEmail ? eq(user.email, customerEmail) : undefined,
          ),
        )
        .orderBy(desc(wardrobes.createdAt))
        .limit(limit);
      return json(rows);
    },
  );

  server.registerTool(
    "list_contact_messages",
    {
      title: "List contact messages",
      description:
        "Messages from the site's contact form, newest first, with the sender's name, email and phone.",
      inputSchema: z.object({
        status: z.enum(["new", "read", "replied"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: READ_ONLY,
    },
    async ({ status, limit }) => {
      const rows = await db
        .select({
          name: contactMessages.name,
          email: contactMessages.email,
          phone: contactMessages.phone,
          message: contactMessages.message,
          status: contactMessages.status,
          createdAt: contactMessages.createdAt,
        })
        .from(contactMessages)
        .where(status ? eq(contactMessages.status, status) : undefined)
        .orderBy(desc(contactMessages.createdAt))
        .limit(limit);
      return json(rows);
    },
  );

  server.registerTool(
    "sales_summary",
    {
      title: "Sales summary",
      description:
        "Orders and revenue (RSD) for a period: count, total, average, counts per status, and the most ordered korpus and door materials. Without dates: all time.",
      inputSchema: z.object({
        from: dateString.optional(),
        to: dateString.optional(),
      }),
      annotations: READ_ONLY,
    },
    async ({ from, to }) => {
      const period = and(
        from ? gte(orders.createdAt, day(from) as Date) : undefined,
        to ? lte(orders.createdAt, day(to, true) as Date) : undefined,
      );
      const byField = (
        field:
          | typeof orders.status
          | typeof orders.paymentStatus
          | typeof orders.fulfillmentStatus,
      ) =>
        db
          .select({ value: field, orders: count() })
          .from(orders)
          .where(period)
          .groupBy(field);
      const topMaterial = (
        field: typeof orders.materialId | typeof orders.frontMaterialId,
      ) =>
        db
          .select({ material: materials.name, orders: count() })
          .from(orders)
          .innerJoin(materials, eq(materials.id, field))
          .where(period)
          .groupBy(materials.name)
          .orderBy(desc(count()))
          .limit(5);
      const [[totals], status, payment, fulfillment, korpus, front] =
        await Promise.all([
          db
            .select({ orders: count(), revenueRsd: sum(orderTotal) })
            .from(orders)
            .where(period),
          byField(orders.status),
          byField(orders.paymentStatus),
          byField(orders.fulfillmentStatus),
          topMaterial(orders.materialId),
          topMaterial(orders.frontMaterialId),
        ]);
      const revenue = Number(totals?.revenueRsd ?? 0);
      return json({
        period: { from: from ?? null, to: to ?? null },
        orders: totals?.orders ?? 0,
        revenueRsd: revenue,
        averageRsd: totals?.orders ? Math.round(revenue / totals.orders) : 0,
        byStatus: status,
        byPayment: payment,
        byFulfillment: fulfillment,
        topKorpusMaterials: korpus,
        topDoorMaterials: front,
      });
    },
  );

  server.registerTool(
    "agacija_price_check",
    {
      title: "Check prices against Agacija",
      description:
        "Reads supplier Agacija's current price list and compares it with ours, changing nothing: how many prices would change at a given global margin, the biggest changes, codes Agacija no longer has, and new Agacija decor boards we don't carry.",
      inputSchema: z.object({
        marginPercent: z.number().int().min(0).max(300).default(0),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ marginPercent }) => {
      const res = await fetch(AGACIJA_INDEX_URL, {
        headers: { Referer: "https://www.agacija.com/" },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      const index = parseAgacijaIndex(await res.json().catch(() => null));
      if (index.size < AGACIJA_MIN_ITEMS) {
        return json({ error: "Agacija's price list didn't load" });
      }
      const rows = await db
        .select({
          id: materials.id,
          name: materials.name,
          productCode: materials.productCode,
          price: materials.price,
          costPrice: materials.costPrice,
          marginPercent: materials.marginPercent,
        })
        .from(materials);
      const plan = planPriceSync(rows, index, marginPercent);
      const biggest = [...plan.changes]
        .sort(
          (a, b) =>
            Math.abs(b.newPrice - b.oldPrice) / Math.max(b.oldPrice, 1) -
            Math.abs(a.newPrice - a.oldPrice) / Math.max(a.oldPrice, 1),
        )
        .slice(0, 15);
      const fresh = findNewProducts(
        index,
        rows.map((r) => r.productCode),
      );
      return json({
        supplierItems: index.size,
        wouldChange: plan.changes.length,
        unchanged: plan.unchanged,
        biggestChanges: biggest,
        notOnAgacija: plan.notFound,
        newOnAgacija: fresh.map((p) => ({
          code: p.code,
          name: p.name,
          priceRsdM2: Math.round(p.price),
        })),
        applyIn: `${SITE}/admin/materials/cene`,
      });
    },
  );

  server.registerTool(
    "list_todo_notes",
    {
      title: "List to-do notes",
      description: "The notes on the admin to-do board, newest change first.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const rows = await db
        .select({
          body: todoNotes.body,
          color: todoNotes.color,
          updatedAt: todoNotes.updatedAt,
        })
        .from(todoNotes)
        .orderBy(desc(todoNotes.updatedAt))
        .limit(200);
      return json(rows);
    },
  );
}
