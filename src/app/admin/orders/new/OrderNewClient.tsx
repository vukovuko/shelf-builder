"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Material {
  id: number;
  name: string;
  category: string;
}

interface Wardrobe {
  id: string;
  name: string;
  userId: string;
}

interface OrderNewClientProps {
  users: User[];
  materials: Material[];
  wardrobes: Wardrobe[];
}

export function OrderNewClient({
  users,
  materials,
  wardrobes,
}: OrderNewClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combobox open states
  const [userOpen, setUserOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [backMaterialOpen, setBackMaterialOpen] = useState(false);

  // Selected values
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedWardrobeId, setSelectedWardrobeId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [selectedBackMaterialId, setSelectedBackMaterialId] =
    useState<string>("");

  // Filter wardrobes by selected user
  const filteredWardrobes = useMemo(() => {
    if (!selectedUserId) return [];
    return wardrobes.filter((w) => w.userId === selectedUserId);
  }, [selectedUserId, wardrobes]);

  // Group materials by category
  const materialsByCategory = useMemo(() => {
    const grouped: Record<string, Material[]> = {};
    materials.forEach((m) => {
      if (!grouped[m.category]) {
        grouped[m.category] = [];
      }
      grouped[m.category].push(m);
    });
    return grouped;
  }, [materials]);

  // Get selected labels
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedWardrobe = filteredWardrobes.find(
    (w) => w.id === selectedWardrobeId,
  );
  const selectedMaterial = materials.find(
    (m) => String(m.id) === selectedMaterialId,
  );
  const selectedBackMaterial = materials.find(
    (m) => String(m.id) === selectedBackMaterialId,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const areaM2 = Number(formData.get("area"));
    const areaCm2 = Math.round(areaM2 * 10000);

    const data = {
      userId: selectedUserId,
      wardrobeId: selectedWardrobeId || null,
      materialId: Number(selectedMaterialId),
      backMaterialId: selectedBackMaterialId
        ? Number(selectedBackMaterialId)
        : null,
      area: areaCm2,
      totalPrice: Number(formData.get("totalPrice")),
      notes: (formData.get("notes") as string) || null,
    };

    if (!selectedUserId) {
      setError("Izaberi korisnika");
      setSaving(false);
      return;
    }

    if (!selectedMaterialId) {
      setError("Izaberi materijal");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri cuvanju");
      }

      toast.success("Porudzbina kreirana");
      router.push("/admin/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska pri cuvanju");
      toast.error(err instanceof Error ? err.message : "Greska pri cuvanju");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nova porudzbina</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Kreiraj novu porudzbinu
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Korisnik</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Korisnik *</Label>
                <Popover open={userOpen} onOpenChange={setUserOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedUser
                        ? `${selectedUser.name} (${selectedUser.email})`
                        : "Izaberi korisnika..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Pretrazi korisnike..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nema rezultata.</CommandEmpty>
                        <CommandGroup>
                          {users.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={`${u.name} ${u.email}`}
                              onSelect={() => {
                                setSelectedUserId(u.id);
                                setSelectedWardrobeId("");
                                setUserOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUserId === u.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div>
                                <div className="font-medium">{u.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {u.email}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Orman (opciono)</Label>
                <Popover open={wardrobeOpen} onOpenChange={setWardrobeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={wardrobeOpen}
                      disabled={!selectedUserId}
                      className="w-full justify-between font-normal"
                    >
                      {selectedWardrobe
                        ? selectedWardrobe.name
                        : selectedUserId
                          ? "Izaberi orman..."
                          : "Prvo izaberi korisnika"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Pretrazi ormane..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nema ormana.</CommandEmpty>
                        <CommandGroup>
                          {filteredWardrobes.map((w) => (
                            <CommandItem
                              key={w.id}
                              value={w.name}
                              onSelect={() => {
                                setSelectedWardrobeId(w.id);
                                setWardrobeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedWardrobeId === w.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {w.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Materijali</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Glavni materijal *</Label>
                <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={materialOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedMaterial
                        ? selectedMaterial.name
                        : "Izaberi materijal..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Pretrazi materijale..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nema rezultata.</CommandEmpty>
                        {Object.entries(materialsByCategory).map(
                          ([category, mats]) => (
                            <CommandGroup key={category} heading={category}>
                              {mats.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={`${m.name} ${category}`}
                                  onSelect={() => {
                                    setSelectedMaterialId(String(m.id));
                                    setMaterialOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMaterialId === String(m.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {m.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ),
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Materijal pozadine (opciono)</Label>
                <Popover
                  open={backMaterialOpen}
                  onOpenChange={setBackMaterialOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={backMaterialOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedBackMaterial
                        ? selectedBackMaterial.name
                        : "Izaberi materijal pozadine..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Pretrazi materijale..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nema rezultata.</CommandEmpty>
                        {Object.entries(materialsByCategory).map(
                          ([category, mats]) => (
                            <CommandGroup key={category} heading={category}>
                              {mats.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={`${m.name} ${category}`}
                                  onSelect={() => {
                                    setSelectedBackMaterialId(String(m.id));
                                    setBackMaterialOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedBackMaterialId === String(m.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {m.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ),
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dimenzije i cena</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">Kvadratura (m²) *</Label>
                <Input
                  id="area"
                  name="area"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="npr. 2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalPrice">Ukupna cena (RSD) *</Label>
                <Input
                  id="totalPrice"
                  name="totalPrice"
                  type="number"
                  min={1}
                  required
                  placeholder="npr. 50000"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Napomene</h2>
            <div className="space-y-2">
              <Label htmlFor="notes">Napomene (opciono)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Dodatne napomene za porudzbinu..."
                rows={3}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/orders">Odustani</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Cuvanje..." : "Kreiraj porudzbinu"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
