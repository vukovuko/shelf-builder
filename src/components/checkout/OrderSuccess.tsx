"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface OrderSuccessProps {
  orderSuccess: {
    orderNumber: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  };
  totalPrice: number;
  adjustedTotal?: number | null;
  visibleAdjustments?: { description: string; amount: number }[] | null;
  formatPrice: (n: number) => string;
  onClose: () => void;
}

export function OrderSuccess({
  orderSuccess,
  totalPrice,
  adjustedTotal,
  visibleAdjustments,
  formatPrice,
  onClose,
}: OrderSuccessProps) {
  const [copied, setCopied] = useState(false);
  const hasAdjustments =
    visibleAdjustments &&
    visibleAdjustments.length > 0 &&
    adjustedTotal != null;
  const finalPrice = adjustedTotal ?? totalPrice;

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(`#${orderSuccess.orderNumber}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback - do nothing
    }
  };

  return (
    <>
      <div className="flex flex-col items-center text-center py-6 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Porudžbina primljena!</h2>
          <p className="text-muted-foreground">
            {orderSuccess.customerEmail
              ? "Dobićete email sa potvrdom i detaljima vaše porudžbine. Kontaktiraćemo vas radi dogovora o dostavi."
              : "Vaša porudžbina je zabeležena. Javićemo vam se ukoliko budemo imali bilo kakvih pitanja."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
          <span className="text-sm text-muted-foreground">
            Broj porudžbine:
          </span>
          <span className="font-bold text-lg">#{orderSuccess.orderNumber}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={copyOrderNumber}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h3 className="font-medium text-sm">Detalji porudžbine</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ime:</span>
            <span className="font-medium">{orderSuccess.customerName}</span>
          </div>
          {orderSuccess.customerEmail && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{orderSuccess.customerEmail}</span>
            </div>
          )}
          {orderSuccess.customerPhone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefon:</span>
              <span>{orderSuccess.customerPhone}</span>
            </div>
          )}
          {hasAdjustments ? (
            <>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="text-muted-foreground">Osnovna cena:</span>
                <span className="tabular-nums">
                  {formatPrice(totalPrice)} RSD
                </span>
              </div>
              {visibleAdjustments!.map((adj, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {adj.description}
                  </span>
                  <span className="tabular-nums">
                    {adj.amount >= 0 ? "+" : ""}
                    {formatPrice(adj.amount)} RSD
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Ukupno:</span>
                <span className="font-bold">{formatPrice(finalPrice)} RSD</span>
              </div>
            </>
          ) : (
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="text-muted-foreground">Ukupno:</span>
              <span className="font-bold">{formatPrice(finalPrice)} RSD</span>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button onClick={onClose} className="w-full sm:w-auto">
          Zatvori
        </Button>
      </DialogFooter>
    </>
  );
}
