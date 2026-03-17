"use client";

import { ShoppingBag, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateSrLatn } from "@/lib/date-format";

interface Order {
  id: string;
  orderNumber: number;
  status: "open" | "archived" | "cancelled";
  paymentStatus:
    | "unpaid"
    | "pending"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillmentStatus:
    | "unfulfilled"
    | "in_progress"
    | "on_hold"
    | "scheduled"
    | "partially_fulfilled"
    | "fulfilled";
  totalPrice: number;
  adjustedTotal: number | null;
  createdAt: Date;
}

const statusLabels: Record<Order["status"], string> = {
  open: "Otvorena",
  archived: "Arhivirana",
  cancelled: "Otkazana",
};

const paymentLabels: Record<Order["paymentStatus"], string> = {
  unpaid: "Neplaćeno",
  pending: "Na čekanju",
  partially_paid: "Delimično plaćeno",
  paid: "Plaćeno",
  partially_refunded: "Delimični povrat",
  refunded: "Vraćeno",
  voided: "Poništeno",
};

const fulfillmentLabels: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "Nije isporučeno",
  in_progress: "U pripremi",
  on_hold: "Na čekanju",
  scheduled: "Zakazano",
  partially_fulfilled: "Delimično isporučeno",
  fulfilled: "Isporučeno",
};

function getPaymentBadgeVariant(
  status: Order["paymentStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
    case "partially_paid":
      return "secondary";
    case "unpaid":
      return "outline";
    default:
      return "destructive";
  }
}

function getFulfillmentBadgeVariant(
  status: Order["fulfillmentStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "fulfilled":
      return "default";
    case "in_progress":
    case "scheduled":
      return "secondary";
    case "on_hold":
      return "destructive";
    default:
      return "outline";
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-Latn-RS", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

interface OrdersClientProps {
  orders: Order[];
}

export function OrdersClient({ orders }: OrdersClientProps) {
  return (
    <div className="mx-auto max-w-5xl py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Moje Porudžbine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pregled vaših porudžbina
        </p>
      </div>

      {orders.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag className="h-10 w-10" />
            </EmptyMedia>
            <EmptyTitle>Nemate porudžbina</EmptyTitle>
            <EmptyDescription>
              Kada naručite orman, vaše porudžbine će se prikazati ovde.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/design">
              <Button>Dizajnirajte orman</Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden divide-y divide-border">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              {/* Left: order number + date */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    #{order.orderNumber}
                  </span>
                  {order.status === "cancelled" && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {statusLabels[order.status]}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateSrLatn(order.createdAt)}
                </p>
              </div>

              {/* Middle: status badges */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <Badge
                  variant={getPaymentBadgeVariant(order.paymentStatus)}
                  className="text-[10px] px-1.5 py-0"
                >
                  {paymentLabels[order.paymentStatus]}
                </Badge>
                <Badge
                  variant={getFulfillmentBadgeVariant(order.fulfillmentStatus)}
                  className="text-[10px] px-1.5 py-0"
                >
                  {fulfillmentLabels[order.fulfillmentStatus]}
                </Badge>
              </div>

              {/* Right: price + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums">
                  {formatPrice(order.adjustedTotal ?? order.totalPrice)} RSD
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
