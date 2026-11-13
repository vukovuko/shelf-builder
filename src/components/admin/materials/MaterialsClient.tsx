"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteRequest,
  patchJson,
  useListAction,
} from "@/components/admin/list-actions";
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
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const listAction = useListAction<Material>("materials", "materials");
  const isDeleting = listAction.isPending;
  const isUpdatingStatus = listAction.isPending;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  // Back/forward or a sidebar link changes `search`; follow it, or the
  // debounced push would put the old search straight back into the URL.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }
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

  function handleBulkDelete() {
    const rows = selectedMaterials;
    setShowDeleteDialog(false);
    setSelectedMaterials([]);
    listAction.mutate({
      rows,
      send: (material) => deleteRequest(`/api/admin/materials/${material.id}`),
      apply: () => null,
      done: `${rows.length} materijala obrisano`,
      failed: "Greška pri brisanju materijala",
    });
  }

  function handleBulkPublish(selected: Material[]) {
    const rows = selected.filter((material) => !material.published);
    if (rows.length === 0) {
      toast.info("Svi izabrani materijali su već objavljeni");
      return;
    }
    setSelectedMaterials([]);
    listAction.mutate({
      rows,
      send: (material) =>
        patchJson(`/api/admin/materials/${material.id}`, { published: true }),
      apply: (material) => ({ ...material, published: true }),
      done: `${rows.length} materijala objavljeno`,
      failed: "Greška pri objavljivanju materijala",
    });
  }

  function handleBulkDraft(selected: Material[]) {
    const rows = selected.filter((material) => material.published);
    if (rows.length === 0) {
      toast.info("Svi izabrani materijali su već u draft-u");
      return;
    }
    setSelectedMaterials([]);
    listAction.mutate({
      rows,
      send: (material) =>
        patchJson(`/api/admin/materials/${material.id}`, { published: false }),
      apply: (material) => ({ ...material, published: false }),
      done: `${rows.length} materijala vraćeno u draft`,
      failed: "Greška pri vraćanju materijala u draft",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Materijali</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje materijalima za konfigurator
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/materials/cene">Cene sa Agacije</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/materials/new">Dodaj materijal</Link>
          </Button>
        </div>
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
