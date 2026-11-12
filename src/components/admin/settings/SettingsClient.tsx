"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save } from "lucide-react";

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  pib: string;
  mb: string;
  bankAccount: string;
  paymentCode: string;
  contactPhone: string;
  contactEmail: string;
}

interface SettingsClientProps {
  initialSettings: CompanySettings;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field: keyof CompanySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju");
        return;
      }

      toast.success("Podešavanja su sačuvana");
    } catch {
      toast.error("Greška pri komunikaciji sa serverom");
    } finally {
      setIsSaving(false);
    }
  };

  // Format account for preview: BBB-AAAAAAAAAAAAA-KK
  const accountPreview =
    settings.bankAccount.length === 18
      ? `${settings.bankAccount.slice(0, 3)}-${settings.bankAccount.slice(3, 16)}-${settings.bankAccount.slice(16)}`
      : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Podešavanja firme</h1>
          <p className="text-sm text-muted-foreground">
            Podaci koji se koriste za priznanicu i IPS QR kod na fakturi
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Čuvanje..." : "Sačuvaj"}
        </Button>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Podaci o firmi</CardTitle>
          <CardDescription>
            Osnovni podaci koji se prikazuju na priznanici
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="companyName">Naziv firme</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="SLAVISA BLESIC PR STILANO"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="companyAddress">Adresa</Label>
            <Input
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => update("companyAddress", e.target.value)}
              placeholder="ŽUPANA PRIBILA 14"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyCity">Grad</Label>
            <Input
              id="companyCity"
              value={settings.companyCity}
              onChange={(e) => update("companyCity", e.target.value)}
              placeholder="BEOGRAD"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyPostalCode">Poštanski broj</Label>
            <Input
              id="companyPostalCode"
              value={settings.companyPostalCode}
              onChange={(e) => update("companyPostalCode", e.target.value)}
              placeholder="11080"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pib">PIB</Label>
            <Input
              id="pib"
              value={settings.pib}
              onChange={(e) => update("pib", e.target.value)}
              placeholder="114816997"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mb">Matični broj</Label>
            <Input
              id="mb"
              value={settings.mb}
              onChange={(e) => update("mb", e.target.value)}
              placeholder="67875834"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Podaci za plaćanje</CardTitle>
          <CardDescription>
            Račun i šifra plaćanja za IPS QR kod
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bankAccount">
              Broj računa (18 cifara, bez crtica)
            </Label>
            <Input
              id="bankAccount"
              value={settings.bankAccount}
              onChange={(e) =>
                update("bankAccount", e.target.value.replace(/\D/g, ""))
              }
              placeholder="265110031009240172"
              maxLength={18}
            />
            {accountPreview && (
              <p className="text-xs text-muted-foreground">
                Prikaz: {accountPreview}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentCode">Šifra plaćanja (3 cifre)</Label>
            <Input
              id="paymentCode"
              value={settings.paymentCode}
              onChange={(e) =>
                update("paymentCode", e.target.value.replace(/\D/g, ""))
              }
              placeholder="289"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              289 = bezgotovinski prenos po nalogu
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Kontakt podaci</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Telefon</Label>
            <Input
              id="contactPhone"
              value={settings.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              placeholder="062351598"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={settings.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="slavisa.blesic96@gmail.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </Button>
      </div>
    </div>
  );
}
