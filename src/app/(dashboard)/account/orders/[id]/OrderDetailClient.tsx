"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  CreditCard,
  Truck,
  Box,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scene } from "@/components/Scene";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { formatDateSrLatn } from "@/lib/date-format";

interface PriceBreakdown {
  korpus: { areaM2: number; price: number; materialName: string };
  front: { areaM2: number; price: number; materialName: string };
  back: { areaM2: number; price: number; materialName: string };
  edge: {
    lengthCm: number;
    lengthM: number;
    price: number;
    materialName?: string;
    carcass?: {
      lengthCm: number;
      lengthM: number;
      price: number;
      materialName: string;
    };
    front?: {
      lengthCm: number;
      lengthM: number;
      price: number;
      materialName: string;
    };
  };
  handles?: { count: number; price: number };
}

interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingStreet: string;
  shippingApartment: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  wardrobeName: string | null;
  materialName: string | null;
  frontMaterialName: string | null;
  backMaterialName: string | null;
  edgeMaterialName: string | null;
  area: number;
  totalPrice: number;
  priceBreakdown: PriceBreakdown | null;
  adjustedTotal: number | null;
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
  createdAt: string;
}

interface OrderDetailClientProps {
  order: Order;
  wardrobeData: Record<string, unknown> | null;
  materials: Material[];
}

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

const statusLabels: Record<Order["status"], string> = {
  open: "Otvorena",
  archived: "Arhivirana",
  cancelled: "Otkazana",
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

function formatEdgeLength(lengthM: number): string {
  return `${lengthM.toFixed(2)} m`;
}

export function OrderDetailClient({
  order,
  wardrobeData,
  materials,
}: OrderDetailClientProps) {
  const wardrobeRef = useRef<any>(null);
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);

  const setMaterials = useShelfStore((state: ShelfState) => state.setMaterials);
  const setIsPreviewMode = useShelfStore(
    (state: ShelfState) => state.setIsPreviewMode,
  );

  useEffect(() => {
    if (wardrobeData && materials.length > 0) {
      setMaterials(materials);
      useShelfStore.getState().resetToDefaults();
      applyWardrobeSnapshot(wardrobeData);
      setIsSceneLoaded(true);
    }
  }, [wardrobeData, materials, setMaterials]);

  useEffect(() => {
    setIsPreviewMode(true);
    return () => {
      setIsPreviewMode(false);
    };
  }, [setIsPreviewMode]);

  const finalPrice = order.adjustedTotal ?? order.totalPrice;

  return (
    <div className="mx-auto max-w-5xl py-10 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account/orders">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold">#{order.orderNumber}</h1>
            {order.status === "cancelled" && (
              <Badge variant="destructive">{statusLabels[order.status]}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateSrLatn(order.createdAt)}
          </p>
        </div>
        <p className="text-2xl font-bold shrink-0">
          {formatPrice(finalPrice)}{" "}
          <span className="text-base font-medium text-muted-foreground">
            RSD
          </span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Status */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </h2>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-xs font-medium text-muted-foreground">
                Plaćanje
              </p>
              <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                {paymentLabels[order.paymentStatus]}
              </Badge>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-xs font-medium text-muted-foreground">
                Isporuka
              </p>
              <Badge
                variant={getFulfillmentBadgeVariant(order.fulfillmentStatus)}
              >
                {fulfillmentLabels[order.fulfillmentStatus]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Product + Address side by side on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Product Info */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Proizvod
              </h2>
            </div>
            <div className="divide-y divide-border">
              {order.wardrobeName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Orman
                  </p>
                  <p className="text-sm font-medium">{order.wardrobeName}</p>
                </div>
              )}
              {order.materialName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Korpus
                  </p>
                  <p className="text-sm">{order.materialName}</p>
                </div>
              )}
              {order.frontMaterialName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Front
                  </p>
                  <p className="text-sm">{order.frontMaterialName}</p>
                </div>
              )}
              {order.backMaterialName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Zadnja strana
                  </p>
                  <p className="text-sm">{order.backMaterialName}</p>
                </div>
              )}
              {order.priceBreakdown?.edge.carcass && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Kant traka korpus
                  </p>
                  <p className="text-sm">
                    {order.priceBreakdown.edge.carcass.materialName}
                  </p>
                </div>
              )}
              {order.priceBreakdown?.edge.front && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Kant traka front
                  </p>
                  <p className="text-sm">
                    {order.priceBreakdown.edge.front.materialName}
                  </p>
                </div>
              )}
              {!order.priceBreakdown?.edge.carcass &&
                !order.priceBreakdown?.edge.front &&
                order.edgeMaterialName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Kant traka
                  </p>
                  <p className="text-sm">{order.edgeMaterialName}</p>
                </div>
                )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dostava
              </h2>
            </div>
            <div className="px-5 py-4 space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p>{order.shippingStreet}</p>
              {order.shippingApartment && <p>{order.shippingApartment}</p>}
              <p>
                {order.shippingPostalCode} {order.shippingCity}
              </p>
              {(order.customerPhone || order.customerEmail) && (
                <div className="pt-2 mt-2 border-t border-border space-y-0.5 text-muted-foreground">
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                  {order.customerEmail && <p>{order.customerEmail}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        {order.priceBreakdown && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <Box className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cena
              </h2>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-muted-foreground">Korpus</p>
                <p className="text-sm tabular-nums">
                  {formatPrice(order.priceBreakdown.korpus.price)} RSD
                </p>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-muted-foreground">Front</p>
                <p className="text-sm tabular-nums">
                  {formatPrice(order.priceBreakdown.front.price)} RSD
                </p>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-muted-foreground">Zadnja strana</p>
                <p className="text-sm tabular-nums">
                  {formatPrice(order.priceBreakdown.back.price)} RSD
                </p>
              </div>
              {order.priceBreakdown?.edge.carcass && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    Kant traka korpus ({formatEdgeLength(order.priceBreakdown.edge.carcass.lengthM)})
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatPrice(order.priceBreakdown.edge.carcass.price)} RSD
                  </p>
                </div>
              )}
              {order.priceBreakdown?.edge.front && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    Kant traka front ({formatEdgeLength(order.priceBreakdown.edge.front.lengthM)})
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatPrice(order.priceBreakdown.edge.front.price)} RSD
                  </p>
                </div>
              )}
              {!order.priceBreakdown?.edge.carcass &&
                !order.priceBreakdown?.edge.front &&
                order.edgeMaterialName && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    Kant traka ({formatEdgeLength(order.priceBreakdown.edge.lengthM)})
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatPrice(order.priceBreakdown.edge.price)} RSD
                  </p>
                </div>
                )}
              {order.priceBreakdown.handles && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    Ručice ({order.priceBreakdown.handles.count}x)
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatPrice(order.priceBreakdown.handles.price)} RSD
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3.5 bg-muted/30">
                <p className="text-sm font-semibold">Ukupno</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(finalPrice)} RSD
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3D Preview */}
        {wardrobeData && isSceneLoaded && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  3D Prikaz
                </h2>
              </div>
              <ViewModeToggle />
            </div>
            <div className="h-[50vh] min-h-[350px] max-h-[500px]">
              <Scene wardrobeRef={wardrobeRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
