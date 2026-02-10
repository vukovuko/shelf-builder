"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, X, Check, Loader2, Mail, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";

interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

const nameSchema = z
  .string()
  .min(1, "Ime ne može biti prazno")
  .max(100, "Ime mora biti kraće od 100 karaktera");

const phoneSchema = z
  .string()
  .regex(
    /^(\+?[1-9]\d{6,14})?$/,
    "Nevažeći format telefona (npr. +381601234567)",
  )
  .or(z.literal(""));

interface AccountClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    phone?: string | null;
    createdAt?: Date;
    emailVerified?: boolean;
    shippingStreet?: string | null;
    shippingApartment?: string | null;
    shippingCity?: string | null;
    shippingPostalCode?: string | null;
    receiveNewsletter?: boolean | null;
  };
}

const RESEND_COOLDOWN_SECONDS = 60;

export function AccountClient({ user }: AccountClientProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [receiveNewsletter, setReceiveNewsletter] = useState(
    user.receiveNewsletter ?? false,
  );

  // Address state
  const [addressData, setAddressData] = useState({
    shippingStreet: user.shippingStreet || "",
    shippingApartment: user.shippingApartment || "",
    shippingCity: user.shippingCity || "",
    shippingPostalCode: user.shippingPostalCode || "",
  });

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const lastResendTime = localStorage.getItem("lastVerificationResend");
    if (lastResendTime) {
      const elapsed = Math.floor(
        (Date.now() - parseInt(lastResendTime)) / 1000,
      );
      const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
      if (remaining > 0) {
        setResendCooldown(remaining);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  // Fetch address suggestions
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
  const handleStreetChange = (value: string) => {
    setAddressData((prev) => ({ ...prev, shippingStreet: value }));

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

      // Combine city and municipality if both exist
      let cityValue = data.city || "";
      if (data.city && data.municipality) {
        cityValue = `${data.city}, ${data.municipality}`;
      }

      setAddressData((prev) => ({
        ...prev,
        shippingStreet:
          data.street || suggestion.mainText || prev.shippingStreet,
        shippingCity: cityValue || prev.shippingCity,
        shippingPostalCode: data.postalCode || prev.shippingPostalCode,
      }));
    } catch {
      // Fallback: just use the main text
      setAddressData((prev) => ({
        ...prev,
        shippingStreet: suggestion.mainText || prev.shippingStreet,
      }));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Save address
  const handleSaveAddress = async () => {
    if (!addressData.shippingStreet.trim()) {
      toast.error("Ulica je obavezna");
      return;
    }
    if (!addressData.shippingCity.trim()) {
      toast.error("Grad je obavezan");
      return;
    }
    if (!addressData.shippingPostalCode.trim()) {
      toast.error("Poštanski broj je obavezan");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Greška pri čuvanju adrese");
      }

      toast.success("Adresa je uspešno sačuvana");
      router.refresh();
      setIsEditingAddress(false);
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(
        error instanceof Error ? error.message : "Greška pri čuvanju adrese",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEditAddress = () => {
    setAddressData({
      shippingStreet: user.shippingStreet || "",
      shippingApartment: user.shippingApartment || "",
      shippingCity: user.shippingCity || "",
      shippingPostalCode: user.shippingPostalCode || "",
    });
    setIsEditingAddress(false);
    setShowSuggestions(false);
  };

  const hasAddress =
    user.shippingStreet || user.shippingCity || user.shippingPostalCode;

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: user.email,
      });

      if (result.error) {
        toast.error(result.error.message || "Greška pri slanju emaila");
      } else {
        toast.success("Verifikacioni email je poslat");
        localStorage.setItem("lastVerificationResend", Date.now().toString());
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (error) {
      console.error("Failed to resend verification:", error);
      toast.error("Greška pri slanju emaila");
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleSaveName = async () => {
    const validation = nameSchema.safeParse(name.trim());
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    if (name === user.name) {
      setIsEditingName(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.updateUser({
        name: validation.data,
      });

      if (result.error) {
        toast.error(result.error.message || "Greška pri ažuriranju imena");
        setName(user.name);
      } else {
        toast.success("Ime je uspešno ažurirano");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Greška pri ažuriranju imena");
      setName(user.name);
    } finally {
      setIsLoading(false);
      setIsEditingName(false);
    }
  };

  const handleSavePhone = async () => {
    const trimmedPhone = phone.trim();

    const validation = phoneSchema.safeParse(trimmedPhone);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    if (trimmedPhone === (user.phone || "")) {
      setIsEditingPhone(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.updateUser({
        phone: trimmedPhone || null,
      });

      if (result.error) {
        toast.error(result.error.message || "Greška pri ažuriranju telefona");
        setPhone(user.phone || "");
      } else {
        toast.success("Telefon je uspešno ažuriran");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update phone:", error);
      toast.error("Greška pri ažuriranju telefona");
      setPhone(user.phone || "");
    } finally {
      setIsLoading(false);
      setIsEditingPhone(false);
    }
  };

  const handleCancelEditName = () => {
    setName(user.name);
    setIsEditingName(false);
  };

  const handleCancelEditPhone = () => {
    setPhone(user.phone || "");
    setIsEditingPhone(false);
  };

  const handleToggleNewsletter = async (checked: boolean) => {
    setReceiveNewsletter(checked);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiveNewsletter: checked }),
      });

      if (!res.ok) {
        setReceiveNewsletter(!checked);
        toast.error("Greška pri ažuriranju podešavanja");
      }
    } catch {
      setReceiveNewsletter(!checked);
      toast.error("Greška pri ažuriranju podešavanja");
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Podešavanja naloga</h1>
          <p className="text-muted-foreground mt-1">
            Upravljajte informacijama o vašem nalogu
          </p>
        </div>
      </div>

      {/* Email Verification Banner */}
      {user.emailVerified === false && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-amber-200">
              Vaš email nije verifikovan. Proverite inbox ili kliknite dugme za
              novi link.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={isResending || resendCooldown > 0}
              className="shrink-0"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Slanje...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Ponovo za {resendCooldown}s
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Pošalji link
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Name - Editable */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Ime
          </label>
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") handleCancelEditName();
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveName}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEditName}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-base">{user.name}</p>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsEditingName(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Email
          </label>
          <p className="text-base">{user.email}</p>
        </div>

        {/* Phone - Editable */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Telefon
          </label>
          {isEditingPhone ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                autoFocus
                placeholder="+381 60 123 4567"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePhone();
                  if (e.key === "Escape") handleCancelEditPhone();
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSavePhone}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEditPhone}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-base">{user.phone || "Nije unet"}</p>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsEditingPhone(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Created At */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Nalog kreiran
          </label>
          <p className="text-base">
            {user.createdAt ? formatDate(user.createdAt) : "N/A"}
          </p>
        </div>

        {/* Email Verified */}
        {user.emailVerified !== undefined && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email verifikovan
            </label>
            <p className="text-base">
              {user.emailVerified ? "✓ Verifikovan" : "✗ Nije verifikovan"}
            </p>
          </div>
        )}
      </div>

      {/* Shipping Address Section */}
      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Adresa za dostavu</h2>
          </div>
          {!isEditingAddress && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingAddress(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {hasAddress ? "Izmeni" : "Dodaj"}
            </Button>
          )}
        </div>

        {isEditingAddress ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-4">
              <div className="relative" ref={suggestionRef}>
                <Label htmlFor="shippingStreet">Ulica i broj *</Label>
                <div className="relative">
                  <Input
                    id="shippingStreet"
                    value={addressData.shippingStreet}
                    onChange={(e) => handleStreetChange(e.target.value)}
                    onFocus={() =>
                      suggestions.length > 0 && setShowSuggestions(true)
                    }
                    placeholder="Bulevar Kralja Aleksandra 123"
                    className="mt-1"
                    autoComplete="off"
                  />
                  {loadingSuggestions && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />
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
              </div>

              <div>
                <Label htmlFor="shippingApartment">Sprat/Stan</Label>
                <Input
                  id="shippingApartment"
                  value={addressData.shippingApartment}
                  onChange={(e) =>
                    setAddressData((prev) => ({
                      ...prev,
                      shippingApartment: e.target.value,
                    }))
                  }
                  placeholder="3/12"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
              <div>
                <Label htmlFor="shippingCity">Grad/Opština *</Label>
                <Input
                  id="shippingCity"
                  value={addressData.shippingCity}
                  onChange={(e) =>
                    setAddressData((prev) => ({
                      ...prev,
                      shippingCity: e.target.value,
                    }))
                  }
                  placeholder="Beograd"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="shippingPostalCode">Poštanski broj *</Label>
                <Input
                  id="shippingPostalCode"
                  value={addressData.shippingPostalCode}
                  onChange={(e) =>
                    setAddressData((prev) => ({
                      ...prev,
                      shippingPostalCode: e.target.value,
                    }))
                  }
                  placeholder="11000"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelEditAddress}
                disabled={isLoading}
              >
                Otkaži
              </Button>
              <Button onClick={handleSaveAddress} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Čuvanje...
                  </>
                ) : (
                  "Sačuvaj adresu"
                )}
              </Button>
            </div>
          </div>
        ) : hasAddress ? (
          <div className="text-sm space-y-1">
            <p className="font-medium">{user.shippingStreet}</p>
            {user.shippingApartment && (
              <p className="text-muted-foreground">{user.shippingApartment}</p>
            )}
            <p className="text-muted-foreground">
              {user.shippingPostalCode} {user.shippingCity}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Niste dodali adresu za dostavu. Dodajte adresu da biste ubrzali
            proces naručivanja.
          </p>
        )}
      </Card>

      {/* Notifications Section */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Obaveštenja</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Novosti i promocije</p>
            <p className="text-xs text-muted-foreground">
              Primajte email o novim materijalima, akcijama i savetima.
            </p>
          </div>
          <Switch
            checked={receiveNewsletter}
            onCheckedChange={handleToggleNewsletter}
          />
        </div>
      </Card>
    </div>
  );
}
