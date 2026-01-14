"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    wardrobeSnapshot: Record<string, any>;
    thumbnail: string | null;
    materialId: number;
    materialName: string;
    backMaterialId: number | null;
    backMaterialName: string | null;
    totalArea: number; // in cm²
    totalPrice: number; // in RSD
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
}

// Divider component for I/ILI
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        i/ili
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function CheckoutDialog({
  open,
  onOpenChange,
  orderData,
}: CheckoutDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingStreet: "",
    shippingCity: "",
    shippingPostalCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Ime je obavezno";
    }

    if (!formData.customerEmail.trim() && !formData.customerPhone.trim()) {
      newErrors.customerEmail = "Unesite email ili telefon";
      newErrors.customerPhone = "Unesite email ili telefon";
    }

    if (
      formData.customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
    ) {
      newErrors.customerEmail = "Neispravan email format";
    }

    if (!formData.shippingStreet.trim()) {
      newErrors.shippingStreet = "Ulica je obavezna";
    }

    if (!formData.shippingCity.trim()) {
      newErrors.shippingCity = "Grad je obavezan";
    }

    if (!formData.shippingPostalCode.trim()) {
      newErrors.shippingPostalCode = "Poštanski broj je obavezan";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          wardrobeSnapshot: orderData.wardrobeSnapshot,
          thumbnail: orderData.thumbnail,
          materialId: orderData.materialId,
          backMaterialId: orderData.backMaterialId,
          area: orderData.totalArea,
          totalPrice: Math.round(orderData.totalPrice),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Greška pri slanju porudžbine");
      }

      const data = await res.json();
      toast.success("Porudžbina uspešno poslata!", {
        description: `Broj porudžbine: ${data.orderId.slice(0, 8)}...`,
      });

      // Reset form and close
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        shippingStreet: "",
        shippingCity: "",
        shippingPostalCode: "",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri slanju");
    } finally {
      setSubmitting(false);
    }
  };

  // Format price
  const formatPrice = (n: number) =>
    n.toLocaleString("sr-RS", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Format area from cm² to m²
  const areaM2 = orderData.totalArea / 10000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Poruči orman
          </DialogTitle>
          <DialogDescription>
            Popunite podatke za dostavu. Kontaktiraćemo vas radi potvrde.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h3 className="font-medium text-sm">Rezime porudžbine</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Dimenzije:</span>
              <span>
                {orderData.dimensions.width} × {orderData.dimensions.height} ×{" "}
                {orderData.dimensions.depth} cm
              </span>

              <span className="text-muted-foreground">Materijal:</span>
              <span>{orderData.materialName}</span>

              <span className="text-muted-foreground">Površina:</span>
              <span>{areaM2.toFixed(2)} m²</span>
            </div>
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Ukupno:</span>
                <span className="text-lg font-bold">
                  {formatPrice(orderData.totalPrice)} RSD
                </span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Kontakt podaci</h3>

            <div className="space-y-2">
              <Label htmlFor="customerName">Ime i prezime *</Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Petar Petrović"
                className={errors.customerName ? "border-destructive" : ""}
              />
              {errors.customerName && (
                <p className="text-xs text-destructive">
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Email with I/ILI Phone */}
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="petar@example.com"
                className={errors.customerEmail ? "border-destructive" : ""}
              />
              {errors.customerEmail && (
                <p className="text-xs text-destructive">
                  {errors.customerEmail}
                </p>
              )}
            </div>

            <OrDivider />

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefon</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="+381 64 123 4567"
                className={errors.customerPhone ? "border-destructive" : ""}
              />
              {errors.customerPhone && (
                <p className="text-xs text-destructive">
                  {errors.customerPhone}
                </p>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Adresa za dostavu</h3>

            <div className="space-y-2">
              <Label htmlFor="shippingStreet">Ulica i broj *</Label>
              <Input
                id="shippingStreet"
                name="shippingStreet"
                value={formData.shippingStreet}
                onChange={handleChange}
                placeholder="Bulevar Kralja Aleksandra 123"
                className={errors.shippingStreet ? "border-destructive" : ""}
              />
              {errors.shippingStreet && (
                <p className="text-xs text-destructive">
                  {errors.shippingStreet}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shippingCity">Grad *</Label>
                <Input
                  id="shippingCity"
                  name="shippingCity"
                  value={formData.shippingCity}
                  onChange={handleChange}
                  placeholder="Beograd"
                  className={errors.shippingCity ? "border-destructive" : ""}
                />
                {errors.shippingCity && (
                  <p className="text-xs text-destructive">
                    {errors.shippingCity}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingPostalCode">Poštanski broj *</Label>
                <Input
                  id="shippingPostalCode"
                  name="shippingPostalCode"
                  value={formData.shippingPostalCode}
                  onChange={handleChange}
                  placeholder="11000"
                  className={
                    errors.shippingPostalCode ? "border-destructive" : ""
                  }
                />
                {errors.shippingPostalCode && (
                  <p className="text-xs text-destructive">
                    {errors.shippingPostalCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Slanje...
                </>
              ) : (
                "Potvrdi porudžbinu"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
