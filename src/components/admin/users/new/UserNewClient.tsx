"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/components/admin/admin-fetch";
import { PageHeader, SaveBar } from "@/components/admin/page-chrome";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORM_ID = "new-user-form";

export function UserNewClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Typing in any field. The pickers below have their own state.
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("user");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const phone = (formData.get("phone") as string).trim();

    // Validate at least one contact method
    if (!email && !phone) {
      setError("Morate uneti email ili telefon");
      setSaving(false);
      return;
    }

    const shippingStreet = (formData.get("shippingStreet") as string).trim();
    const shippingApartment = (
      formData.get("shippingApartment") as string
    ).trim();
    const shippingCity = (formData.get("shippingCity") as string).trim();
    const shippingPostalCode = (
      formData.get("shippingPostalCode") as string
    ).trim();

    const data = {
      name: formData.get("name") as string,
      email: email || undefined,
      phone: phone || undefined,
      role,
      shippingStreet: shippingStreet || undefined,
      shippingApartment: shippingApartment || undefined,
      shippingCity: shippingCity || undefined,
      shippingPostalCode: shippingPostalCode || undefined,
    };

    try {
      const res = await adminFetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Greska pri kreiranju");
      }

      toast.success(json.message || "Korisnik kreiran");
      router.push("/admin/users");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Greska pri kreiranju";
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SaveBar
        form={FORM_ID}
        dirty={touched || role !== "user"}
        saving={saving}
      />

      <PageHeader backHref="/admin/users" title="Novi korisnik" />

      <Card className="p-6">
        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          onInput={() => setTouched(true)}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Ime i prezime *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="npr. Petar Petrovic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Uloga</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Korisnik</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email adresa</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="npr. petar@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="npr. 0641234567"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Adresa (opciono)</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shippingStreet">Ulica i broj</Label>
                <Input
                  id="shippingStreet"
                  name="shippingStreet"
                  placeholder="npr. Knez Mihailova 15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingApartment">Stan/Sprat</Label>
                <Input
                  id="shippingApartment"
                  name="shippingApartment"
                  placeholder="npr. Stan 5, 3. sprat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCity">Grad</Label>
                <Input
                  id="shippingCity"
                  name="shippingCity"
                  placeholder="npr. Beograd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingPostalCode">Poštanski broj</Label>
                <Input
                  id="shippingPostalCode"
                  name="shippingPostalCode"
                  placeholder="npr. 11000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Sa emailom</p>
                <p className="text-muted-foreground">
                  Korisnik dobija email za postavljanje lozinke i moze se
                  prijaviti
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Samo telefon</p>
                <p className="text-muted-foreground">
                  Korisnik ne moze da se prijavi - admin upravlja njihovim
                  nalozima
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </Card>
    </div>
  );
}
