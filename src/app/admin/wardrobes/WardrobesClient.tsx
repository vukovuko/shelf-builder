"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { columns, type Wardrobe } from "./columns";

interface WardrobesClientProps {
  wardrobes: Wardrobe[];
}

export function WardrobesClient({ wardrobes }: WardrobesClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWardrobes, setSelectedWardrobes] = useState<Wardrobe[]>([]);

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      const results = await Promise.all(
        selectedWardrobes.map((wardrobe) =>
          fetch(`/api/admin/wardrobes/${wardrobe.id}`, { method: "DELETE" })
        )
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedWardrobes.length} ormana obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih ormana");
      }
    } catch (error) {
      console.error("Failed to delete wardrobes:", error);
      toast.error("Greška pri brisanju ormana");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedWardrobes([]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Ormani</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Svi ormani svih korisnika</p>
      </div>
      <DataTable
        columns={columns}
        data={wardrobes}
        searchKey="name"
        searchPlaceholder="Pretrazi po nazivu..."
        onRowClick={(wardrobe) =>
          router.push(`/admin/wardrobes/${wardrobe.id}`)
        }
        enableRowSelection
        getRowId={(wardrobe) => wardrobe.id}
        bulkActions={(selected) => (
          <div
            className={cn(
              "flex items-center gap-2 transition-opacity",
              selected.length > 0
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            )}
          >
            <span className="text-sm text-muted-foreground">
              {selected.length} izabrano
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setSelectedWardrobes(selected);
                    setShowDeleteDialog(true);
                  }}
                >
                  Obriši izabrane
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati ormane?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedWardrobes.length} ormana će
              biti trajno obrisano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
