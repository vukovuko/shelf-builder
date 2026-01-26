"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
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
import { columns, type Material } from "./columns";

interface MaterialsClientProps {
  materials: Material[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function MaterialsClient({
  materials,
  page,
  pageSize,
  totalCount,
  search,
}: MaterialsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  // Debounced search - updates URL after 300ms of no typing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 when searching
      params.delete("page");
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      } else {
        params.delete("search");
      }
      const query = params.toString();
      const newUrl = query ? `${pathname}?${query}` : pathname;
      // Only push if the search value actually changed
      if (searchInput !== search) {
        router.push(newUrl);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput, pathname, router, searchParams, search]);

  const handlePageChange = (pageIndex: number) => {
    const nextPage = pageIndex + 1;
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      const results = await Promise.all(
        selectedMaterials.map((material) =>
          fetch(`/api/admin/materials/${material.id}`, { method: "DELETE" }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedMaterials.length} materijala obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih materijala");
      }
    } catch (error) {
      console.error("Failed to delete materials:", error);
      toast.error("Greška pri brisanju materijala");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedMaterials([]);
    }
  }

  async function handleBulkPublish(selected: Material[]) {
    const toPublish = selected.filter((m) => !m.published);
    if (toPublish.length === 0) {
      toast.info("Svi izabrani materijali su već objavljeni");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toPublish.map((material) =>
          fetch(`/api/admin/materials/${material.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: true }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toPublish.length} materijala objavljeno`);
        setSelectedMaterials([]);
        router.refresh();
      } else {
        toast.error("Greška pri objavljivanju nekih materijala");
      }
    } catch (error) {
      console.error("Failed to publish materials:", error);
      toast.error("Greška pri objavljivanju materijala");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleBulkDraft(selected: Material[]) {
    const toDraft = selected.filter((m) => m.published);
    if (toDraft.length === 0) {
      toast.info("Svi izabrani materijali su već u draft-u");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toDraft.map((material) =>
          fetch(`/api/admin/materials/${material.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: false }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toDraft.length} materijala vraćeno u draft`);
        setSelectedMaterials([]);
        router.refresh();
      } else {
        toast.error("Greška pri vraćanju nekih materijala u draft");
      }
    } catch (error) {
      console.error("Failed to draft materials:", error);
      toast.error("Greška pri vraćanju materijala u draft");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Materijali</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje materijalima za konfigurator
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/materials/new">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj materijal
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={materials}
        searchPlaceholder="Pretrazi po nazivu..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(material) =>
          router.push(`/admin/materials/${material.id}`)
        }
        enableRowSelection
        getRowId={(material) => String(material.id)}
        selectedItems={selectedMaterials}
        onSelectionChange={setSelectedMaterials}
        bulkActions={(selected) => (
          <div
            className={cn(
              "flex items-center gap-2 transition-opacity",
              selected.length > 0
                ? "opacity-100"
                : "opacity-0 pointer-events-none",
            )}
          >
            <span className="text-sm text-muted-foreground">
              {selected.length} izabrano
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isUpdatingStatus}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleBulkPublish(selected)}
                  disabled={isUpdatingStatus}
                >
                  Objavi izabrane
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkDraft(selected)}
                  disabled={isUpdatingStatus}
                >
                  Vrati u draft
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setSelectedMaterials(selected);
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
            <AlertDialogTitle>Obrisati materijale?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedMaterials.length} materijala će
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
