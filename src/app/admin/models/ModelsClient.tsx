"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { columns, type Model } from "./columns";

interface ModelsClientProps {
  models: Model[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function ModelsClient({
  models,
  page,
  pageSize,
  totalCount,
  search,
}: ModelsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
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
        selectedModels.map((model) =>
          fetch(`/api/admin/wardrobes/${model.id}`, { method: "DELETE" }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedModels.length} modela obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih modela");
      }
    } catch (error) {
      console.error("Failed to delete models:", error);
      toast.error("Greška pri brisanju modela");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedModels([]);
    }
  }

  async function handleTogglePublish(id: string, value: boolean) {
    try {
      const res = await fetch(`/api/admin/wardrobes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedModel: value }),
      });

      if (res.ok) {
        toast.success(value ? "Model objavljen" : "Model sakriven");
        router.refresh();
      } else {
        toast.error("Greška pri ažuriranju modela");
      }
    } catch (error) {
      console.error("Failed to toggle publish:", error);
      toast.error("Greška pri ažuriranju modela");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Modeli</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Predlošci ormana za korisnike
        </p>
      </div>
      <DataTable
        columns={columns}
        data={models}
        searchPlaceholder="Pretraži po nazivu..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(model) => router.push(`/design?load=${model.id}`)}
        enableRowSelection
        getRowId={(model) => model.id}
        meta={{ onTogglePublish: handleTogglePublish }}
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
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setSelectedModels(selected);
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
            <AlertDialogTitle>Obrisati modele?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedModels.length} modela će biti
              trajno obrisano.
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
