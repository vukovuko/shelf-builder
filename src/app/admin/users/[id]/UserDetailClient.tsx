"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Trash2,
  Pencil,
  X,
  Check,
  Copy,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Wardrobe {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  receiveOrderEmails: boolean | null;
  tags: string | null;
  notes: string | null;
  // Address fields
  shippingStreet: string | null;
  shippingApartment: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  createdAt: string;
  updatedAt: string;
  wardrobes: Wardrobe[];
  orders: Order[];
  totalSpent: number;
  orderCount: number;
}

interface UserDetailClientProps {
  user: UserData;
}

// Helper to format price
function formatPrice(n: number) {
  return n.toLocaleString("sr-RS");
}

// Helper to copy text to clipboard
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("Kopirano");
}

// Helper to format relative time
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "danas";
  if (diffDays === 1) return "1 dan";
  if (diffDays < 30) return `${diffDays} dana`;
  if (diffDays < 60) return "1 mesec";
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} meseci`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 godina" : `${years} godine`;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    // Payment
    unpaid: { label: "Neplaćeno", variant: "destructive" },
    pending: { label: "Na čekanju", variant: "outline" },
    partially_paid: { label: "Delimično", variant: "outline" },
    paid: { label: "Plaćeno", variant: "default" },
    partially_refunded: { label: "Del. refund", variant: "outline" },
    refunded: { label: "Refundirano", variant: "secondary" },
    voided: { label: "Poništeno", variant: "secondary" },
    // Fulfillment
    unfulfilled: { label: "Neobrađeno", variant: "secondary" },
    in_progress: { label: "U obradi", variant: "outline" },
    on_hold: { label: "Na čekanju", variant: "outline" },
    scheduled: { label: "Zakazano", variant: "outline" },
    partially_fulfilled: { label: "Delimično", variant: "outline" },
    fulfilled: { label: "Isporučeno", variant: "default" },
  };

  const c = config[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function UserDetailClient({ user: initialUser }: UserDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tags editing
  const [editingTags, setEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(user.notes || "");

  // Contact info editing (name, phone)
  const [editingContact, setEditingContact] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [phoneInput, setPhoneInput] = useState(user.phone || "");

  // Address editing
  const [editingAddress, setEditingAddress] = useState(false);
  const [streetInput, setStreetInput] = useState(user.shippingStreet || "");
  const [apartmentInput, setApartmentInput] = useState(
    user.shippingApartment || "",
  );
  const [cityInput, setCityInput] = useState(user.shippingCity || "");
  const [postalCodeInput, setPostalCodeInput] = useState(
    user.shippingPostalCode || "",
  );

  // Parse tags from JSON string
  const tags: string[] = user.tags ? JSON.parse(user.tags) : [];

  // Last order
  const lastOrder = user.orders[0] || null;

  // Address from last order
  const lastAddress = lastOrder
    ? `${lastOrder.shippingStreet}, ${lastOrder.shippingPostalCode} ${lastOrder.shippingCity}`
    : null;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Korisnik je obrisan");
        router.push("/admin/users");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri brisanju korisnika");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Greška pri brisanju korisnika");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRoleChange(newRole: string) {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });

      if (res.ok) {
        setUser((prev) => ({ ...prev, role: newRole }));
        toast.success("Uloga je promenjena");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri promeni uloge");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Greška pri promeni uloge");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleEmailNotificationChange(checked: boolean) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiveOrderEmails: checked }),
      });

      if (res.ok) {
        setUser((prev) => ({ ...prev, receiveOrderEmails: checked }));
        toast.success(
          checked ? "Notifikacije uključene" : "Notifikacije isključene",
        );
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri promeni podešavanja");
      }
    } catch (error) {
      console.error("Failed to update email notifications:", error);
      toast.error("Greška pri promeni podešavanja");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSaveTags() {
    const newTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: JSON.stringify(newTags) }),
      });

      if (res.ok) {
        setUser((prev) => ({ ...prev, tags: JSON.stringify(newTags) }));
        setEditingTags(false);
        toast.success("Tagovi sačuvani");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju tagova");
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
      toast.error("Greška pri čuvanju tagova");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSaveNotes() {
    if (notesInput === (user.notes || "")) {
      setEditingNotes(false);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput || null }),
      });

      if (res.ok) {
        setUser((prev) => ({ ...prev, notes: notesInput || null }));
        setEditingNotes(false);
        toast.success("Beleške sačuvane");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju beležaka");
      }
    } catch (error) {
      console.error("Failed to update notes:", error);
      toast.error("Greška pri čuvanju beležaka");
    } finally {
      setIsUpdating(false);
    }
  }

  function startEditTags() {
    setTagsInput(tags.join(", "));
    setEditingTags(true);
  }

  async function handleSaveContact() {
    if (nameInput === user.name && phoneInput === (user.phone || "")) {
      setEditingContact(false);
      return;
    }

    if (!nameInput.trim()) {
      toast.error("Ime je obavezno");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          phone: phoneInput.trim() || null,
        }),
      });

      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          name: nameInput.trim(),
          phone: phoneInput.trim() || null,
        }));
        setEditingContact(false);
        toast.success("Kontakt podaci sačuvani");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju");
      }
    } catch (error) {
      console.error("Failed to update contact:", error);
      toast.error("Greška pri čuvanju kontakt podataka");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSaveAddress() {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingStreet: streetInput.trim() || null,
          shippingApartment: apartmentInput.trim() || null,
          shippingCity: cityInput.trim() || null,
          shippingPostalCode: postalCodeInput.trim() || null,
        }),
      });

      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          shippingStreet: streetInput.trim() || null,
          shippingApartment: apartmentInput.trim() || null,
          shippingCity: cityInput.trim() || null,
          shippingPostalCode: postalCodeInput.trim() || null,
        }));
        setEditingAddress(false);
        toast.success("Adresa sačuvana");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju adrese");
      }
    } catch (error) {
      console.error("Failed to update address:", error);
      toast.error("Greška pri čuvanju adrese");
    } finally {
      setIsUpdating(false);
    }
  }

  function startEditContact() {
    setNameInput(user.name);
    setPhoneInput(user.phone || "");
    setEditingContact(true);
  }

  function startEditAddress() {
    setStreetInput(user.shippingStreet || "");
    setApartmentInput(user.shippingApartment || "");
    setCityInput(user.shippingCity || "");
    setPostalCodeInput(user.shippingPostalCode || "");
    setEditingAddress(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <h1 className="text-2xl sm:text-3xl font-semibold truncate cursor-pointer">
                {user.name}
              </h1>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              className="w-auto max-w-xs p-2 text-sm"
            >
              {user.name}
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile delete button - icon only */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              disabled={isDeleting}
              className="sm:hidden h-8 w-8 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati korisnika?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Korisnik &quot;{user.name}&quot; i svi
                njegovi ormani će biti trajno obrisani.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Obriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Desktop delete button - with text */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isDeleting}
              className="hidden sm:flex shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Brisanje..." : "Obriši"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati korisnika?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Korisnik &quot;{user.name}&quot; i svi
                njegovi ormani će biti trajno obrisani.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Obriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-muted/30">
        <div>
          <p className="text-sm text-muted-foreground">Potrošeno</p>
          <p className="text-xl font-semibold">
            {formatPrice(user.totalSpent)} RSD
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Porudžbine</p>
          <p className="text-xl font-semibold">{user.orderCount}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Korisnik od</p>
          <p className="text-xl font-semibold">
            {getRelativeTime(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Last Order */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Poslednja porudžbina
            </h2>
            {lastOrder ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${lastOrder.id}`}
                      className="font-mono text-sm hover:underline"
                    >
                      #{lastOrder.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <StatusBadge status={lastOrder.paymentStatus} />
                    <StatusBadge status={lastOrder.fulfillmentStatus} />
                  </div>
                  <span className="font-semibold text-lg">
                    {formatPrice(lastOrder.totalPrice)} RSD
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(lastOrder.createdAt).toLocaleDateString("sr-RS", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/orders?userId=${user.id}`}>
                      Sve porudžbine
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                <p className="mb-4">Nema porudžbina</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/orders/new">Kreiraj porudžbinu</Link>
                </Button>
              </div>
            )}
          </Card>

          {/* Wardrobes */}
          <Card>
            <div className="px-4 py-2.5 border-b">
              <h2 className="text-sm font-medium text-muted-foreground">
                Ormani
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naziv</TableHead>
                  <TableHead>Kreiran</TableHead>
                  <TableHead>Ažuriran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.wardrobes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Korisnik nema ormana
                    </TableCell>
                  </TableRow>
                ) : (
                  user.wardrobes.map((wardrobe) => (
                    <TableRow
                      key={wardrobe.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/admin/wardrobes/${wardrobe.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {wardrobe.name}
                      </TableCell>
                      <TableCell>
                        {new Date(wardrobe.createdAt).toLocaleDateString(
                          "sr-RS",
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(wardrobe.updatedAt).toLocaleDateString(
                          "sr-RS",
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Timeline */}
          <Card className="p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Aktivnost
            </h2>
            <div className="space-y-3">
              {user.orders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("sr-RS")}
                  </span>
                  <span>
                    Kreirana porudžbina{" "}
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("sr-RS")}
                </span>
                <span>Nalog kreiran</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - 1/3 width (Sidebar) */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Korisnik
              </h2>
              {!editingContact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={startEditContact}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {editingContact ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ime</Label>
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ime i prezime"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefon</Label>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Telefon"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={user.email}
                    disabled
                    className="text-sm bg-muted"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveContact}
                    disabled={isUpdating}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Sačuvaj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingContact(false)}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Kontakt
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm truncate">{user.email}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => copyToClipboard(user.email)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {user.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{user.phone}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copyToClipboard(user.phone!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Address Card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Adresa
                </p>
              </div>
              {!editingAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={startEditAddress}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {editingAddress ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ulica i broj</Label>
                  <Input
                    value={streetInput}
                    onChange={(e) => setStreetInput(e.target.value)}
                    placeholder="npr. Knez Mihailova 15"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stan/Sprat</Label>
                  <Input
                    value={apartmentInput}
                    onChange={(e) => setApartmentInput(e.target.value)}
                    placeholder="npr. Stan 5, 3. sprat"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grad</Label>
                  <Input
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="npr. Beograd"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Poštanski broj</Label>
                  <Input
                    value={postalCodeInput}
                    onChange={(e) => setPostalCodeInput(e.target.value)}
                    placeholder="npr. 11000"
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveAddress}
                    disabled={isUpdating}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Sačuvaj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAddress(false)}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : user.shippingStreet || user.shippingCity ? (
              <div className="space-y-1">
                {user.shippingStreet && (
                  <p className="text-sm">{user.shippingStreet}</p>
                )}
                {user.shippingApartment && (
                  <p className="text-sm text-muted-foreground">
                    {user.shippingApartment}
                  </p>
                )}
                {(user.shippingPostalCode || user.shippingCity) && (
                  <p className="text-sm">
                    {user.shippingPostalCode} {user.shippingCity}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs mt-1"
                  onClick={() => {
                    const addr = [
                      user.shippingStreet,
                      user.shippingApartment,
                      `${user.shippingPostalCode || ""} ${user.shippingCity || ""}`.trim(),
                    ]
                      .filter(Boolean)
                      .join(", ");
                    copyToClipboard(addr);
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Kopiraj
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nema adrese</p>
            )}
          </Card>

          {/* Role & Notifications */}
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Uloga
              </p>
              <Select
                value={user.role}
                onValueChange={handleRoleChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Korisnik</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user.role === "admin" && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor="email-notifications" className="text-sm">
                  Email notifikacije
                </Label>
                <Switch
                  id="email-notifications"
                  checked={user.receiveOrderEmails ?? false}
                  onCheckedChange={handleEmailNotificationChange}
                  disabled={isUpdating}
                />
              </div>
            )}
          </Card>

          {/* Tags */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Tagovi
              </p>
              {!editingTags && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={startEditTags}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {editingTags ? (
              <div className="space-y-2">
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="vip, loyal, wholesale"
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveTags}
                    disabled={isUpdating}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Sačuvaj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTags(false)}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nema tagova</p>
                )}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Beleške
              </p>
              {!editingNotes && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditingNotes(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Interne beleške o korisniku..."
                  className="text-sm min-h-[80px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isUpdating}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Sačuvaj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNotesInput(user.notes || "");
                      setEditingNotes(false);
                    }}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {user.notes || "Nema beležaka"}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
