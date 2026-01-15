import { db } from "@/db/db";
import { orders } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import { OrdersClient } from "./OrdersClient";

const PAGE_SIZE = 20;

interface OrdersPageProps {
  searchParams?:
    | Promise<{ page?: string | string[] }>
    | { page?: string | string[] };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const page = Math.max(Number(pageParam) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [allOrders, totalResult] = await Promise.all([
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
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(orders),
  ]);

  const totalCount = Number(totalResult[0]?.count ?? 0);

  const serializedOrders = allOrders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return (
    <OrdersClient
      orders={serializedOrders}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
    />
  );
}
