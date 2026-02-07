"use client";

import { FolderOpen, Lock, MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface Wardrobe {
  id: string;
  name: string;
  thumbnail: string | null;
  isLocked: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

// Simple relative time formatter
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Upravo sada";
  if (diffMin < 60) return `Pre ${diffMin} minut${diffMin !== 1 ? "a" : ""}`;
  if (diffHour < 24) return `Pre ${diffHour} sat${diffHour !== 1 ? "a" : "i"}`;
  if (diffDay < 7) return `Pre ${diffDay} dan${diffDay !== 1 ? "a" : ""}`;
  if (diffDay < 30)
    return `Pre ${Math.floor(diffDay / 7)} nedelj${Math.floor(diffDay / 7) !== 1 ? "e" : "a"}`;
  return new Date(date).toLocaleDateString("sr-RS");
}

interface WardrobesClientProps {
  initialWardrobes: Wardrobe[];
}

export function WardrobesClient({ initialWardrobes }: WardrobesClientProps) {
  const router = useRouter();
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>(initialWardrobes);
  const [wardrobeToDelete, setWardrobeToDelete] = useState<Wardrobe | null>(
    null,
  );

  // Fetch wardrobes function (for refresh after actions)
  async function fetchWardrobes() {
    try {
      const res = await fetch("/api/wardrobes");
      if (res.ok) {
        const data = await res.json();
        setWardrobes(data);
      }
    } catch (error) {
      console.error("Failed to fetch wardrobes:", error);
    }
  }

  // Handle load wardrobe (locked wardrobes open in preview mode)
  function handleLoad(wardrobe: Wardrobe) {
    router.push(`/design?load=${wardrobe.id}`);
  }

  // Handle duplicate wardrobe
  async function handleDuplicate(id: string) {
    const original = wardrobes.find((w) => w.id === id);
    if (!original) return;

    try {
      // Fetch full wardrobe data first
      const res = await fetch(`/api/wardrobes/${id}`);
      if (!res.ok) {
        const errorMsg =
          res.status === 404
            ? "Orman nije pronađen. Možda je već obrisan."
            : "Nije moguće učitati podatke ormana. Proverite internet konekciju.";
        toast.error(errorMsg);
        return;
      }
      const fullWardrobe = await res.json();

      // Create duplicate
      const duplicateRes = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (Kopija)`,
          data: fullWardrobe.data,
          thumbnail: original.thumbnail,
        }),
      });

      if (duplicateRes.ok) {
        toast.success("Orman je dupliran!");
        await fetchWardrobes();
      } else {
        const errorMsg =
          duplicateRes.status === 401
            ? "Niste prijavljeni. Prijavite se i pokušajte ponovo."
            : "Nije moguće duplirati orman. Pokušajte ponovo.";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
      toast.error(
        "Neočekivana greška pri dupliciranju. Proverite internet konekciju.",
      );
    }
  }

  // Handle share wardrobe
  async function handleShare(id: string) {
    const shareUrl = `${window.location.origin}/design?load=${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link je kopiran!");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(
        "Nije moguće kopirati link. Vaš pregledač ne podržava ovu funkciju.",
      );
    }
  }

  // Handle delete wardrobe - open confirmation dialog
  function handleDeleteClick(wardrobe: Wardrobe) {
    setWardrobeToDelete(wardrobe);
  }

  // Confirm and execute delete
  async function confirmDelete() {
    if (!wardrobeToDelete) return;

    try {
      const res = await fetch(`/api/wardrobes/${wardrobeToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Orman je obrisan");
        await fetchWardrobes();
      } else {
        const errorMsg =
          res.status === 404
            ? "Orman nije pronađen. Možda je već obrisan."
            : res.status === 403
              ? "Nemate dozvolu za brisanje ovog ormana."
              : "Nije moguće obrisati orman. Pokušajte ponovo.";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error(
        "Neočekivana greška pri brisanju. Proverite internet konekciju.",
      );
    } finally {
      setWardrobeToDelete(null);
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Moji Ormani</h1>
          <p className="text-muted-foreground mt-1">
            Upravljajte sačuvanim dizajnima ormana
          </p>
        </div>
        <Link href="/design">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novi Orman
          </Button>
        </Link>
      </div>

      {wardrobes.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen className="h-10 w-10" />
            </EmptyMedia>
            <EmptyTitle>Nemate sačuvanih ormana</EmptyTitle>
            <EmptyDescription>
              Napravite svoj prvi dizajn ormana i sačuvajte ga ovde.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/design">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Napravite prvi dizajn
              </Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {wardrobes.map((wardrobe) => (
            <Card
              key={wardrobe.id}
              onClick={() => handleLoad(wardrobe)}
              className="group relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer gap-0 py-0"
            >
              <div className="aspect-[4/3] bg-muted relative">
                {wardrobe.thumbnail ? (
                  <img
                    src={wardrobe.thumbnail}
                    alt={wardrobe.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Nema pregleda
                  </div>
                )}
                {wardrobe.isLocked && (
                  <div className="absolute top-2 right-2 bg-amber-600/90 text-white rounded-full p-1.5">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">
                    {wardrobe.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(wardrobe.updatedAt)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-accent rounded transition flex-shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem onSelect={() => handleLoad(wardrobe)}>
                      {wardrobe.isLocked ? "Pregled" : "Učitaj"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleDuplicate(wardrobe.id)}
                    >
                      Dupliraj
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleShare(wardrobe.id)}>
                      Podeli
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() =>
                        wardrobe.isLocked
                          ? toast.info("Zaključan orman ne može se obrisati.")
                          : handleDeleteClick(wardrobe)
                      }
                      disabled={!!wardrobe.isLocked}
                      className="text-destructive"
                    >
                      Obriši
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!wardrobeToDelete}
        onOpenChange={(open) => !open && setWardrobeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija ne može biti poništena. Ovo će trajno obrisati orman
              &quot;
              {wardrobeToDelete?.name}&quot; i sve njegove podatke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
