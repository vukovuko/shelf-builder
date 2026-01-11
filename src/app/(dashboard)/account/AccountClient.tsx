"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, X, Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";

const nameSchema = z
  .string()
  .min(1, "Ime ne može biti prazno")
  .max(100, "Ime mora biti kraće od 100 karaktera");

const phoneSchema = z
  .string()
  .regex(/^(\+?[1-9]\d{6,14})?$/, "Nevažeći format telefona (npr. +381601234567)")
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
  };
}

const RESEND_COOLDOWN_SECONDS = 60;

export function AccountClient({ user }: AccountClientProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const lastResendTime = localStorage.getItem("lastVerificationResend");
    if (lastResendTime) {
      const elapsed = Math.floor((Date.now() - parseInt(lastResendTime)) / 1000);
      const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
      if (remaining > 0) {
        setResendCooldown(remaining);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
              Vaš email nije verifikovan. Proverite inbox ili kliknite dugme za novi link. Bez verifikacije nećete moći ponovo da se prijavite.
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
    </div>
  );
}
