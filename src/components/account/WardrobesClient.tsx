"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { FolderOpen, Loader2, Lock, MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LinkPending } from "@/components/PendingContent";
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
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { type MyWardrobe, myWardrobesQuery } from "@/server/account.functions";

type Wardrobe = MyWardrobe;

/** A failure whose message is already written for the customer. */
class Refused extends Error {}

// The card shown while a copy is being made has no saved design behind it yet.
const PENDING_ID_PREFIX = "pending:";
const isPending = (wardrobe: Wardrobe) =>
  wardrobe.id.startsWith(PENDING_ID_PREFIX);

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
  return formatDate(date);
}

export function WardrobesClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(myWardrobesQuery);
  const wardrobes = data ?? [];
  // The configurator takes a moment to load; mark which card is opening.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isOpening, startOpening] = useTransition();
  const [wardrobeToDelete, setWardrobeToDelete] = useState<Wardrobe | null>(
    null,
  );

  const listKey = myWardrobesQuery.queryKey;

  // Shows a change at once; returns the list to put back if the server
  // refuses it.
  async function showAtOnce(change: (list: Wardrobe[]) => Wardrobe[]) {
    await queryClient.cancelQueries({ queryKey: listKey });
    const previous = queryClient.getQueryData(listKey);
    queryClient.setQueryData(listKey, (list) => list && change(list));
    return { previous };
  }

  // Saved designs also fill the dropdown of the account's contact form.
  const refetchWardrobes = () =>
    queryClient.invalidateQueries({ queryKey: ["account", "wardrobes"] });

  const duplicate = useMutation({
    mutationFn: async (original: Wardrobe) => {
      const res = await fetch(`/api/wardrobes/${original.id}`);
      if (!res.ok) {
        throw new Refused(
          res.status === 404
            ? "Orman nije pronađen. Možda je već obrisan."
            : "Nije moguće učitati podatke ormana. Proverite internet konekciju.",
        );
      }
      const fullWardrobe = await res.json();

      const created = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (Kopija)`,
          data: fullWardrobe.data,
          thumbnail: original.thumbnail,
        }),
      });
      if (!created.ok) {
        throw new Refused(
          created.status === 401
            ? "Niste prijavljeni. Prijavite se i pokušajte ponovo."
            : "Nije moguće duplirati orman. Pokušajte ponovo.",
        );
      }
    },
    onMutate: (original) => {
      const now = new Date();
      const copy: Wardrobe = {
        ...original,
        id: `${PENDING_ID_PREFIX}${crypto.randomUUID()}`,
        name: `${original.name} (Kopija)`,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
      };
      return showAtOnce((list) => [copy, ...list]);
    },
    onError: (error, _original, context) => {
      queryClient.setQueryData(listKey, context?.previous);
      toast.error(
        error instanceof Refused
          ? error.message
          : "Neočekivana greška pri dupliciranju. Proverite internet konekciju.",
      );
    },
    onSuccess: () => toast.success("Orman je dupliran!"),
    onSettled: refetchWardrobes,
  });

  const remove = useMutation({
    mutationFn: async (wardrobe: Wardrobe) => {
      const res = await fetch(`/api/wardrobes/${wardrobe.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Refused(
          res.status === 404
            ? "Orman nije pronađen. Možda je već obrisan."
            : res.status === 403
              ? "Nemate dozvolu za brisanje ovog ormana."
              : "Nije moguće obrisati orman. Pokušajte ponovo.",
        );
      }
    },
    onMutate: (wardrobe) =>
      showAtOnce((list) => list.filter((item) => item.id !== wardrobe.id)),
    onError: (error, _wardrobe, context) => {
      queryClient.setQueryData(listKey, context?.previous);
      toast.error(
        error instanceof Refused
          ? error.message
          : "Neočekivana greška pri brisanju. Proverite internet konekciju.",
      );
    },
    onSuccess: () => toast.success("Orman je obrisan"),
    onSettled: refetchWardrobes,
  });

  // Handle load wardrobe (locked wardrobes open in preview mode)
  function handleLoad(wardrobe: Wardrobe) {
    if (isPending(wardrobe)) return;
    setOpeningId(wardrobe.id);
    startOpening(() => router.push(`/design?load=${wardrobe.id}`));
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

  function confirmDelete() {
    if (!wardrobeToDelete) return;
    remove.mutate(wardrobeToDelete);
    setWardrobeToDelete(null);
  }

  return (
    <div className="mx-auto max-w-5xl py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Moji Ormani</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upravljajte sačuvanim dizajnima ormana
          </p>
        </div>
        <Link href="/design">
          <Button>
            <LinkPending>Novi orman</LinkPending>
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
                <LinkPending>
                  <Plus className="h-4 w-4 mr-2" />
                  Napravite prvi dizajn
                </LinkPending>
              </Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardrobes.map((wardrobe) => (
            <Card
              key={wardrobe.id}
              onClick={() => handleLoad(wardrobe)}
              className={cn(
                "group relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer gap-0 py-0",
                isPending(wardrobe) && "pointer-events-none opacity-60",
              )}
            >
              <div className="aspect-[4/3] bg-muted relative">
                {isOpening && openingId === wardrobe.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                    <Loader2
                      aria-label="Učitavanje"
                      className="size-6 animate-spin"
                    />
                  </div>
                )}
                {wardrobe.thumbnail ? (
                  <img
                    src={wardrobe.thumbnail}
                    alt={`Pregled ormana: ${wardrobe.name}`}
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
                  {/* "Pre 5 minuta" can tick over between server and browser. */}
                  <p
                    className="text-xs text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(wardrobe.updatedAt)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-accent rounded transition flex-shrink-0"
                      aria-label={`Opcije za ${wardrobe.name}`}
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
                      onSelect={() => duplicate.mutate(wardrobe)}
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
                          : setWardrobeToDelete(wardrobe)
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
