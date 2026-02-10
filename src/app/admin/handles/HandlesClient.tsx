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
import { columns, type Handle } from "./columns";

interface HandlesClientProps {
  handles: Handle[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function HandlesClient({
  handles,
  page,
  pageSize,
  totalCount,
  search,
}: HandlesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHandles, setSelectedHandles] = useState<Handle[]>([]);
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
        selectedHandles.map((handle) =>
          fetch(`/api/admin/handles/${handle.id}`, { method: "DELETE" }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedHandles.length} ručki obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih ručki");
      }
    } catch (error) {
      console.error("Failed to delete handles:", error);
      toast.error("Greška pri brisanju ručki");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedHandles([]);
    }
  }

  async function handleBulkPublish(selected: Handle[]) {
    const toPublish = selected.filter((h) => !h.published);
    if (toPublish.length === 0) {
      toast.info("Sve izabrane ručke su već objavljene");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toPublish.map((handle) =>
          fetch(`/api/admin/handles/${handle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: true }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toPublish.length} ručki objavljeno`);
        setSelectedHandles([]);
        router.refresh();
      } else {
        toast.error("Greška pri objavljivanju nekih ručki");
      }
    } catch (error) {
      console.error("Failed to publish handles:", error);
      toast.error("Greška pri objavljivanju ručki");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleBulkDraft(selected: Handle[]) {
    const toDraft = selected.filter((h) => h.published);
    if (toDraft.length === 0) {
      toast.info("Sve izabrane ručke su već u draft-u");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toDraft.map((handle) =>
          fetch(`/api/admin/handles/${handle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: false }),
          }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${toDraft.length} ručki vraćeno u draft`);
        setSelectedHandles([]);
        router.refresh();
      } else {
        toast.error("Greška pri vraćanju nekih ručki u draft");
      }
    } catch (error) {
      console.error("Failed to draft handles:", error);
      toast.error("Greška pri vraćanju ručki u draft");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Ručke</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje ručkama za vrata
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/handles/new">Dodaj ručku</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={handles}
        searchPlaceholder="Pretraži po nazivu..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(handle) => router.push(`/admin/handles/${handle.id}`)}
        enableRowSelection
        getRowId={(handle) => String(handle.id)}
        selectedItems={selectedHandles}
        onSelectionChange={setSelectedHandles}
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
                    setSelectedHandles(selected);
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
            <AlertDialogTitle>Obrisati ručke?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedHandles.length} ručki će biti
              trajno obrisano zajedno sa svim završnim obradama.
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
