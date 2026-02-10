"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import posthog from "posthog-js";
import { validateCheckoutForm } from "@/lib/checkoutValidation";
import { OrderSuccess } from "@/components/checkout/OrderSuccess";
import { OrderSummaryTable } from "@/components/checkout/OrderSummaryTable";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    wardrobeSnapshot: Record<string, any>;
    thumbnail: string | null;
    materialId: number;
    materialName: string;
    materialProductCode: string | null;
    frontMaterialId: number;
    frontMaterialName: string;
    frontMaterialProductCode: string | null;
    backMaterialId: number | null;
    backMaterialName: string | null;
    backMaterialProductCode: string | null;
    totalArea: number; // in cm²
    totalPrice: number; // in RSD
    priceBreakdown: {
      korpus: { areaM2: number; price: number };
      front: { areaM2: number; price: number };
      back: { areaM2: number; price: number };
      handles?: { count: number; price: number };
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
    notes: "",
    newsletter: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success state
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);

  // Turnstile CAPTCHA state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Track checkout opened + fetch user profile
  useEffect(() => {
    if (open && !orderSuccess) {
      posthog.capture("checkout_started", {
        value: orderData.totalPrice,
        currency: "RSD",
      });
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
              newsletter: data.receiveNewsletter ?? prev.newsletter,
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
    const newErrors = validateCheckoutForm(formData, turnstileToken);
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
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          shippingStreet: formData.shippingStreet,
          shippingApartment: formData.shippingApartment,
          shippingCity: formData.shippingCity,
          shippingPostalCode: formData.shippingPostalCode,
          notes: formData.notes,
          newsletter: formData.newsletter,
          wardrobeSnapshot: orderData.wardrobeSnapshot,
          thumbnail: orderData.thumbnail,
          materialId: orderData.materialId,
          frontMaterialId: orderData.frontMaterialId,
          backMaterialId: orderData.backMaterialId,
          area: orderData.totalArea,
          totalPrice: Math.round(orderData.totalPrice),
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const defaultMsg =
          res.status === 429
            ? "Previše zahteva. Sačekajte minut i pokušajte ponovo."
            : res.status === 401
              ? "Verifikacija nije uspela. Osvežite stranicu i pokušajte ponovo."
              : "Nije moguće poslati porudžbinu. Proverite internet konekciju.";
        throw new Error(data.error || defaultMsg);
      }

      const data = await res.json();

      posthog.capture("order_completed", {
        order_number: data.orderNumber,
        value: Math.round(orderData.totalPrice),
        currency: "RSD",
        wardrobe_id: data.wardrobeId,
      });

      // Show success view instead of toast
      setOrderSuccess({
        orderNumber: data.orderNumber,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Neočekivana greška. Proverite internet konekciju i pokušajte ponovo.",
      );
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
      notes: "",
      newsletter: false,
    });
    setErrors({});
    setOrderSuccess(null);
    setTurnstileToken(null);
    turnstileRef.current?.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:!max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {orderSuccess ? (
          <OrderSuccess
            orderSuccess={orderSuccess}
            totalPrice={orderData.totalPrice}
            formatPrice={formatPrice}
            onClose={handleClose}
          />
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
              <OrderSummaryTable
                orderData={orderData}
                formatPrice={formatPrice}
              />

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

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Napomena (opciono)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Dodatne informacije ili specijalni zahtevi..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Newsletter opt-in */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletter}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      newsletter: checked === true,
                    }))
                  }
                />
                <Label
                  htmlFor="newsletter"
                  className="text-sm font-normal cursor-pointer"
                >
                  Želim da primam novosti i promocije
                </Label>
              </div>

              {/* Turnstile CAPTCHA */}
              <div className="relative pb-5">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  options={{ language: "sr" }}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                />
                {errors.turnstile && (
                  <p className="absolute bottom-0 left-0 text-xs text-destructive">
                    {errors.turnstile}
                  </p>
                )}
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
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    orderData.backMaterialId == null ||
                    !turnstileToken
                  }
                  title={
                    orderData.backMaterialId == null
                      ? "Izaberite materijal za leđa"
                      : !turnstileToken
                        ? "Molimo sačekajte verifikaciju"
                        : undefined
                  }
                >
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
