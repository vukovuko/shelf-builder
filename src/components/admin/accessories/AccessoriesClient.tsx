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
import { type Accessory, columns } from "./columns";

interface AccessoriesClientProps {
  accessories: Accessory[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
  showHeader?: boolean;
}

export function AccessoriesClient({
  accessories,
  page,
  pageSize,
  totalCount,
  search,
  showHeader = true,
}: AccessoriesClientProps) {
  const router = useRouter();
  const listAction = useListAction<Accessory>("accessories", "accessories");
  const isDeleting = listAction.isPending;
  const isUpdatingStatus = listAction.isPending;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>(
    [],
  );
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

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      } else {
        params.delete("search");
      }
      const query = params.toString();
      const newUrl = query ? `${pathname}?${query}` : pathname;
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
    const rows = selectedAccessories;
    setShowDeleteDialog(false);
    setSelectedAccessories([]);
    listAction.mutate({
      rows,
      send: (accessory) =>
        deleteRequest(`/api/admin/accessories/${accessory.id}`),
      apply: () => null,
      done: `${rows.length} stavki okova obrisano`,
      failed: "Greška pri brisanju okova",
    });
  }

  function handleBulkPublish(selected: Accessory[]) {
    const rows = selected.filter((accessory) => !accessory.published);
    if (rows.length === 0) {
      toast.info("Sav izabrani okov je već objavljen");
      return;
    }
    setSelectedAccessories([]);
    listAction.mutate({
      rows,
      send: (accessory) =>
        patchJson(`/api/admin/accessories/${accessory.id}`, {
          published: true,
        }),
      apply: (accessory) => ({ ...accessory, published: true }),
      done: `${rows.length} stavki okova objavljeno`,
      failed: "Greška pri objavljivanju okova",
    });
  }

  function handleBulkDraft(selected: Accessory[]) {
    const rows = selected.filter((accessory) => accessory.published);
    if (rows.length === 0) {
      toast.info("Sav izabrani okov je već u draft-u");
      return;
    }
    setSelectedAccessories([]);
    listAction.mutate({
      rows,
      send: (accessory) =>
        patchJson(`/api/admin/accessories/${accessory.id}`, {
          published: false,
        }),
      apply: (accessory) => ({ ...accessory, published: false }),
      done: `${rows.length} stavki okova vraćeno u draft`,
      failed: "Greška pri vraćanju okova u draft",
    });
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Okov</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Upravljanje okovom za fioke, vrata i klizne sisteme
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/accessories/new">Dodaj okov</Link>
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={accessories}
        searchPlaceholder="Pretraži okov po nazivu..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(accessory) =>
          router.push(`/admin/accessories/${accessory.id}`)
        }
        enableRowSelection
        getRowId={(accessory) => String(accessory.id)}
        selectedItems={selectedAccessories}
        onSelectionChange={setSelectedAccessories}
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
                    setSelectedAccessories(selected);
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
            <AlertDialogTitle>Obrisati okov?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedAccessories.length} stavki
              okova će biti trajno obrisano zajedno sa svim varijantama.
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
