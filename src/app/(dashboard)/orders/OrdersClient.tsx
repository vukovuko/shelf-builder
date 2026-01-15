"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
  return new Intl.NumberFormat("sr-RS", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface OrdersClientProps {
  orders: Order[];
}

export function OrdersClient({ orders }: OrdersClientProps) {
  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Moje Porudžbine</h1>
          <p className="text-muted-foreground mt-1">Pregled vaših porudžbina</p>
        </div>
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
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      #{order.orderNumber}
                    </span>
                    {order.status === "cancelled" && (
                      <Badge variant="destructive">
                        {statusLabels[order.status]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                    {paymentLabels[order.paymentStatus]}
                  </Badge>
                  <Badge
                    variant={getFulfillmentBadgeVariant(
                      order.fulfillmentStatus,
                    )}
                  >
                    {fulfillmentLabels[order.fulfillmentStatus]}
                  </Badge>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {formatPrice(order.totalPrice)} RSD
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
