"use client";

import { Download, MoreHorizontal } from "lucide-react";
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
import { exportCutListAsCsv, exportDesignsCutListAsCsv } from "@/lib/exportCsv";
import { cutListForSavedDesign } from "@/lib/model-cut-list";
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
  // A model is a saved design, so the designs list shows the same records.
  const listAction = useListAction<Model>("models", "models");
  const isDeleting = listAction.isPending;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
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
    const rows = selectedModels;
    setShowDeleteDialog(false);
    setSelectedModels([]);
    listAction.mutate({
      rows,
      send: (model) => deleteRequest(`/api/admin/wardrobes/${model.id}`),
      apply: () => null,
      done: `${rows.length} modela obrisano`,
      failed: "Greška pri brisanju modela",
    });
  }

  // Boards of the given models (all models without ids) in the CNC CSV
  // format, for checking against known-good exports. One model gives exactly
  // the order page's file; several share one file with a "Model" column.
  async function exportCutLists(ids?: string[]) {
    setIsExporting(true);
    try {
      const query = ids?.length ? `?ids=${ids.join(",")}` : "";
      const res = await fetch(`/api/admin/models/cut-list-data${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { models: designs, materials, accessoryRules } = await res.json();
      const cutLists = designs.map(
        (design: { name: string; data: unknown }) => ({
          name: design.name,
          items: cutListForSavedDesign(design.data, materials, accessoryRules)
            .items,
        }),
      );
      if (cutLists.length === 0) {
        toast.error("Nema modela za izvoz");
      } else if (cutLists.length === 1) {
        exportCutListAsCsv(
          cutLists[0].items,
          `${cutLists[0].name}-cut-list.csv`,
        );
      } else {
        const day = new Date().toISOString().slice(0, 10);
        exportDesignsCutListAsCsv(cutLists, `modeli-cut-list-${day}.csv`);
      }
    } catch (error) {
      console.error("Cut list export failed:", error);
      toast.error("Izvoz nije uspeo");
    } finally {
      setIsExporting(false);
    }
  }

  function handleTogglePublish(id: string, value: boolean) {
    const rows = models.filter((model) => model.id === id);
    listAction.mutate({
      rows,
      send: (model) =>
        patchJson(`/api/admin/wardrobes/${model.id}`, {
          publishedModel: value,
        }),
      apply: (model) => ({ ...model, publishedModel: value }),
      done: value ? "Model objavljen" : "Model sakriven",
      failed: "Greška pri ažuriranju modela",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Modeli</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Predlošci ormana za korisnike
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCutLists()}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Izvozim…" : "Daske svih modela (CSV)"}
        </Button>
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
        onRowClick={(model) => router.push(`/design-test?load=${model.id}`)}
        enableRowSelection
        getRowId={(model) => model.id}
        meta={{
          onTogglePublish: handleTogglePublish,
          onExportCutList: (id: string) => exportCutLists([id]),
        }}
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
                  onClick={() => exportCutLists(selected.map((m) => m.id))}
                >
                  Izvezi daske (CSV)
                </DropdownMenuItem>
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
