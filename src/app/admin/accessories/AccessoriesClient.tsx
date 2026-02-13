"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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
import { columns, type Accessory } from "./columns";

interface AccessoriesClientProps {
  accessories: Accessory[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function AccessoriesClient({
  accessories,
  page,
  pageSize,
  totalCount,
  search,
}: AccessoriesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>(
    [],
  );
  const [searchInput, setSearchInput] = useState(search);
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

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      const results = await Promise.all(
        selectedAccessories.map((accessory) =>
          fetch(`/api/admin/accessories/${accessory.id}`, { method: "DELETE" }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedAccessories.length} dodataka obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih dodataka");
      }
    } catch (error) {
      console.error("Failed to delete accessories:", error);
      toast.error("Greška pri brisanju dodataka");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedAccessories([]);
    }
  }

  async function handleBulkPublish(selected: Accessory[]) {
    const toPublish = selected.filter((a) => !a.published);
    if (toPublish.length === 0) {
      toast.info("Svi izabrani dodaci su već objavljeni");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toPublish.map((accessory) =>
          fetch(`/api/admin/accessories/${accessory.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: true }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toPublish.length} dodataka objavljeno`);
        setSelectedAccessories([]);
        router.refresh();
      } else {
        toast.error("Greška pri objavljivanju nekih dodataka");
      }
    } catch (error) {
      console.error("Failed to publish accessories:", error);
      toast.error("Greška pri objavljivanju dodataka");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleBulkDraft(selected: Accessory[]) {
    const toDraft = selected.filter((a) => a.published);
    if (toDraft.length === 0) {
      toast.info("Svi izabrani dodaci su već u draft-u");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toDraft.map((accessory) =>
          fetch(`/api/admin/accessories/${accessory.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: false }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toDraft.length} dodataka vraćeno u draft`);
        setSelectedAccessories([]);
        router.refresh();
      } else {
        toast.error("Greška pri vraćanju nekih dodataka u draft");
      }
    } catch (error) {
      console.error("Failed to draft accessories:", error);
      toast.error("Greška pri vraćanju dodataka u draft");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Dodaci</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje dodacima (klizači, šarke, itd.)
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/accessories/new">Dodaj dodatak</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={accessories}
        searchPlaceholder="Pretraži po nazivu..."
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
            <AlertDialogTitle>Obrisati dodatke?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedAccessories.length} dodataka će
              biti trajno obrisano zajedno sa svim varijantama.
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
