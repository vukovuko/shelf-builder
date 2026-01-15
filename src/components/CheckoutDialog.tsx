"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ShoppingCart, Loader2, CheckCircle2, Copy, Check } from "lucide-react";

interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}
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
    frontMaterialId: number;
    frontMaterialName: string;
    backMaterialId: number | null;
    backMaterialName: string | null;
    totalArea: number; // in cm²
    totalPrice: number; // in RSD
    priceBreakdown: {
      korpus: { areaM2: number; price: number };
      front: { areaM2: number; price: number };
      back: { areaM2: number; price: number };
    };
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
    shippingApartment: "",
    shippingCity: "",
    shippingPostalCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success state
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user profile to pre-fill form when dialog opens
  useEffect(() => {
    if (open && !orderSuccess) {
      fetch("/api/user/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setFormData((prev) => ({
              ...prev,
              customerName: data.name || prev.customerName,
              customerEmail: data.email || prev.customerEmail,
              customerPhone: data.phone || prev.customerPhone,
              shippingStreet: data.shippingStreet || prev.shippingStreet,
              shippingApartment:
                data.shippingApartment || prev.shippingApartment,
              shippingCity: data.shippingCity || prev.shippingCity,
              shippingPostalCode:
                data.shippingPostalCode || prev.shippingPostalCode,
            }));
          }
        })
        .catch(() => {
          // Ignore errors - user might not be logged in
        });
    }
  }, [open, orderSuccess]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when street input changes
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/places/autocomplete?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle street input with debounce
  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, shippingStreet: value }));
    if (errors.shippingStreet) {
      setErrors((prev) => ({ ...prev, shippingStreet: "" }));
    }

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  // Select suggestion and fetch details
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false);
    setLoadingSuggestions(true);

    try {
      const res = await fetch(
        `/api/places/details?placeId=${suggestion.placeId}`,
      );
      const data = await res.json();

      // Combine city and municipality if both exist (e.g., "Beograd, Vračar")
      let cityValue = data.city || "";
      if (data.city && data.municipality) {
        cityValue = `${data.city}, ${data.municipality}`;
      }

      setFormData((prev) => ({
        ...prev,
        shippingStreet:
          data.street || suggestion.mainText || prev.shippingStreet,
        shippingCity: cityValue || prev.shippingCity,
        shippingPostalCode: data.postalCode || prev.shippingPostalCode,
      }));

      // Clear any errors on auto-filled fields
      setErrors((prev) => ({
        ...prev,
        shippingStreet: "",
        shippingCity: "",
        shippingPostalCode: "",
      }));
    } catch {
      // Fallback: just use the main text
      setFormData((prev) => ({
        ...prev,
        shippingStreet: suggestion.mainText || prev.shippingStreet,
      }));
    } finally {
      setLoadingSuggestions(false);
    }
  };

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
          frontMaterialId: orderData.frontMaterialId,
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

      // Show success view instead of toast
      setOrderSuccess({
        orderNumber: data.orderNumber,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
      });
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

  // Handle dialog close - reset all state
  const handleClose = () => {
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      shippingStreet: "",
      shippingApartment: "",
      shippingCity: "",
      shippingPostalCode: "",
    });
    setErrors({});
    setOrderSuccess(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Copy order number to clipboard
  const copyOrderNumber = async () => {
    if (!orderSuccess) return;
    try {
      await navigator.clipboard.writeText(`#${orderSuccess.orderNumber}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback - do nothing
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:!max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {orderSuccess ? (
          // Success View
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
                <span className="font-bold text-lg">
                  #{orderSuccess.orderNumber}
                </span>
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
                  <span className="font-medium">
                    {orderSuccess.customerName}
                  </span>
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
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="text-muted-foreground">Ukupno:</span>
                  <span className="font-bold">
                    {formatPrice(orderData.totalPrice)} RSD
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Zatvori
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Checkout Form
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-start gap-2">
                <ShoppingCart className="h-5 w-5" />
                Poruči orman
              </DialogTitle>
              <DialogDescription>Popunite podatke za dostavu</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
              {/* Order Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Rezime porudžbine</h3>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {orderData.dimensions.width} × {orderData.dimensions.height}{" "}
                    × {orderData.dimensions.depth} cm
                  </span>
                </div>

                {/* Material breakdown table */}
                <div className="overflow-x-auto w-full min-w-0">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="w-[54%] sm:w-[60%] text-left py-2 pr-2 font-medium">
                          Materijal
                        </th>
                        <th className="w-[20%] text-right py-2 pl-2 pr-3 font-medium whitespace-nowrap">
                          m²
                        </th>
                        <th className="w-[26%] sm:w-[20%] text-right py-2 pl-3 font-medium">
                          Cena
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {/* Korpus */}
                      <tr>
                        <td className="py-2.5 pr-2">
                          <div className="text-muted-foreground text-xs">
                            Korpus
                          </div>
                          <div
                            className="font-medium max-w-[180px] sm:max-w-full"
                            title={orderData.materialName}
                          >
                            {orderData.materialName}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                          {orderData.priceBreakdown.korpus.areaM2.toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                          {formatPrice(orderData.priceBreakdown.korpus.price)}
                        </td>
                      </tr>
                      {/* Lica/Vrata */}
                      <tr>
                        <td className="py-2.5 pr-2">
                          <div className="text-muted-foreground text-xs">
                            Lica/Vrata
                          </div>
                          <div
                            className="font-medium max-w-[180px] sm:max-w-full"
                            title={orderData.frontMaterialName}
                          >
                            {orderData.frontMaterialName}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                          {orderData.priceBreakdown.front.areaM2.toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                          {formatPrice(orderData.priceBreakdown.front.price)}
                        </td>
                      </tr>
                      {/* Leđa */}
                      {orderData.backMaterialId && (
                        <tr>
                          <td className="py-2.5 pr-2">
                            <div className="text-muted-foreground text-xs">
                              Leđa
                            </div>
                            <div
                              className="font-medium max-w-[180px] sm:max-w-full"
                              title={orderData.backMaterialName || ""}
                            >
                              {orderData.backMaterialName}
                            </div>
                          </td>
                          <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                            {orderData.priceBreakdown.back.areaM2.toFixed(2)}
                          </td>
                          <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                            {formatPrice(orderData.priceBreakdown.back.price)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td className="py-3 pr-2 font-semibold">Ukupno</td>
                        <td className="py-3 pl-2 pr-3 text-right tabular-nums font-medium whitespace-nowrap">
                          {areaM2.toFixed(2)} m²
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <span className="text-lg font-bold tabular-nums">
                            {formatPrice(orderData.totalPrice)}
                          </span>
                          <span className="text-sm font-medium ml-1">RSD</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-1">
                <h3 className="font-medium text-sm mb-2">Kontakt podaci</h3>

                <div className="relative pb-5">
                  <Label htmlFor="customerName">Ime i prezime *</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Petar Petrović"
                    className={`mt-2 ${errors.customerName ? "border-destructive" : ""}`}
                  />
                  {errors.customerName && (
                    <p className="absolute bottom-0 left-0 text-xs text-destructive">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                {/* Email with I/ILI Phone */}
                <div className="relative pb-5">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    placeholder="petar@example.com"
                    className={`mt-2 ${errors.customerEmail ? "border-destructive" : ""}`}
                  />
                  {errors.customerEmail && (
                    <p className="absolute bottom-0 left-0 text-xs text-destructive">
                      {errors.customerEmail}
                    </p>
                  )}
                </div>

                <OrDivider />

                <div className="relative pb-5">
                  <Label htmlFor="customerPhone">Telefon</Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="+381 64 123 4567"
                    className={`mt-2 ${errors.customerPhone ? "border-destructive" : ""}`}
                  />
                  {errors.customerPhone && (
                    <p className="absolute bottom-0 left-0 text-xs text-destructive">
                      {errors.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1">
                <h3 className="font-medium text-sm mb-2">Adresa za dostavu</h3>

                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <div className="relative pb-5" ref={suggestionRef}>
                    <Label htmlFor="shippingStreet">Ulica i broj *</Label>
                    <div className="relative">
                      <Input
                        id="shippingStreet"
                        name="shippingStreet"
                        value={formData.shippingStreet}
                        onChange={handleStreetChange}
                        onFocus={() =>
                          suggestions.length > 0 && setShowSuggestions(true)
                        }
                        placeholder="Bulevar Kralja Aleksandra 123"
                        className={`mt-2 ${errors.shippingStreet ? "border-destructive" : ""}`}
                        autoComplete="off"
                      />
                      {loadingSuggestions && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
                          {suggestions.map((s) => (
                            <button
                              key={s.placeId}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                              onClick={() => handleSelectSuggestion(s)}
                            >
                              <div className="font-medium text-sm">
                                {s.mainText}
                              </div>
                              {s.secondaryText && (
                                <div className="text-xs text-muted-foreground">
                                  {s.secondaryText}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.shippingStreet && (
                      <p className="absolute bottom-0 left-0 text-xs text-destructive">
                        {errors.shippingStreet}
                      </p>
                    )}
                  </div>

                  <div className="relative pb-5">
                    <Label htmlFor="shippingApartment">Sprat/Stan</Label>
                    <Input
                      id="shippingApartment"
                      name="shippingApartment"
                      value={formData.shippingApartment}
                      onChange={handleChange}
                      placeholder="3/12"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1fr] gap-3">
                  <div className="relative pb-5">
                    <Label htmlFor="shippingCity">Grad/Opština *</Label>
                    <Input
                      id="shippingCity"
                      name="shippingCity"
                      value={formData.shippingCity}
                      onChange={handleChange}
                      placeholder="Beograd"
                      className={`mt-2 ${errors.shippingCity ? "border-destructive" : ""}`}
                    />
                    {errors.shippingCity && (
                      <p className="absolute bottom-0 left-0 text-xs text-destructive">
                        {errors.shippingCity}
                      </p>
                    )}
                  </div>

                  <div className="relative pb-5">
                    <Label htmlFor="shippingPostalCode">Poš. broj *</Label>
                    <Input
                      id="shippingPostalCode"
                      name="shippingPostalCode"
                      value={formData.shippingPostalCode}
                      onChange={handleChange}
                      placeholder="11000"
                      className={`mt-2 ${errors.shippingPostalCode ? "border-destructive" : ""}`}
                    />
                    {errors.shippingPostalCode && (
                      <p className="absolute bottom-0 left-0 text-xs text-destructive">
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
                  onClick={handleClose}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
