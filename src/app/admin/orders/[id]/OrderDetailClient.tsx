"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  wardrobeId: string | null;
  wardrobeName: string | null;
  materialId: number;
  materialName: string | null;
  backMaterialId: number | null;
  backMaterialName: string | null;
  area: number;
  totalPrice: number;
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
  returnStatus:
    | "none"
    | "return_requested"
    | "return_in_progress"
    | "returned"
    | "inspection_complete";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailClientProps {
  order: Order;
}

const statusLabels: Record<Order["status"], string> = {
  open: "Otvoren",
  archived: "Arhiviran",
  cancelled: "Otkazan",
};

const paymentLabels: Record<Order["paymentStatus"], string> = {
  unpaid: "Neplaceno",
  pending: "Na cekanju",
  partially_paid: "Delimicno placeno",
  paid: "Placeno",
  partially_refunded: "Delimicno refundirano",
  refunded: "Refundirano",
  voided: "Ponisteno",
};

const fulfillmentLabels: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "Neizvrseno",
  in_progress: "U toku",
  on_hold: "Na cekanju",
  scheduled: "Zakazano",
  partially_fulfilled: "Delimicno izvrseno",
  fulfilled: "Izvrseno",
};

const returnLabels: Record<Order["returnStatus"], string> = {
  none: "Nema",
  return_requested: "Zatrazeno",
  return_in_progress: "U toku",
  returned: "Vraceno",
  inspection_complete: "Inspekcija zavrsena",
};

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order.fulfillmentStatus,
  );
  const [returnStatus, setReturnStatus] = useState(order.returnStatus);
  const [notes, setNotes] = useState(order.notes || "");

  const hasChanges =
    status !== order.status ||
    paymentStatus !== order.paymentStatus ||
    fulfillmentStatus !== order.fulfillmentStatus ||
    returnStatus !== order.returnStatus ||
    notes !== (order.notes || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          returnStatus,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri cuvanju");
      }

      toast.success("Porudzbina azurirana");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greska pri cuvanju");
    } finally {
      setSaving(false);
    }
  };

  const areaM2 = order.area / 10000;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Porudzbina</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            #{order.orderNumber}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informacije</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Korisnik</Label>
              <p className="font-medium">{order.userName || "-"}</p>
              <p className="text-sm text-muted-foreground">{order.userEmail}</p>
            </div>

            <div>
              <Label className="text-muted-foreground">Orman</Label>
              <p className="font-medium">
                {order.wardrobeName || (
                  <span className="text-muted-foreground">Nije povezan</span>
                )}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Materijal</Label>
              <p className="font-medium">{order.materialName || "-"}</p>
            </div>

            <div>
              <Label className="text-muted-foreground">Kvadratura</Label>
              <p className="font-medium">{areaM2.toFixed(2)} m²</p>
            </div>

            <div>
              <Label className="text-muted-foreground">Ukupna cena</Label>
              <p className="font-medium">
                {order.totalPrice.toLocaleString("sr-RS")} RSD
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Kreirana</Label>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleDateString("sr-RS", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Azurirana</Label>
              <p className="font-medium">
                {new Date(order.updatedAt).toLocaleDateString("sr-RS", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </Card>

        {/* Status Management */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Statusi</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status porudžbine</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Order["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status placanja</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) =>
                  setPaymentStatus(v as Order["paymentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status isporuke</Label>
              <Select
                value={fulfillmentStatus}
                onValueChange={(v) =>
                  setFulfillmentStatus(v as Order["fulfillmentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fulfillmentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status povrata</Label>
              <Select
                value={returnStatus}
                onValueChange={(v) =>
                  setReturnStatus(v as Order["returnStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(returnLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Napomene</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatne napomene..."
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? "Cuvanje..." : "Sacuvaj izmene"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
