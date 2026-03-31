"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { columns, type AccessoryRuleRow } from "./columns";

interface RulesClientProps {
  rules: AccessoryRuleRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function RulesClient({
  rules,
  page,
  pageSize,
  totalCount,
  search,
}: RulesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRules, setSelectedRules] = useState<AccessoryRuleRow[]>([]);
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
  }, [pathname, router, search, searchInput, searchParams]);

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
        selectedRules.map((rule) =>
          fetch(`/api/admin/accessory-rules/${rule.id}`, { method: "DELETE" }),
        ),
      );

      if (results.every((response) => response.ok)) {
        toast.success(`${selectedRules.length} pravila obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih pravila");
      }
    } catch (error) {
      console.error("Failed to delete accessory rules:", error);
      toast.error("Greška pri brisanju pravila");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedRules([]);
    }
  }

  async function handleBulkEnabled(
    selected: AccessoryRuleRow[],
    enabled: boolean,
  ) {
    const toUpdate = selected.filter((rule) => rule.enabled !== enabled);
    if (toUpdate.length === 0) {
      toast.info(
        enabled
          ? "Sva izabrana pravila su već aktivna"
          : "Sva izabrana pravila su već neaktivna",
      );
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const results = await Promise.all(
        toUpdate.map((rule) =>
          fetch(`/api/admin/accessory-rules/${rule.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled }),
          }),
        ),
      );

      if (results.every((response) => response.ok)) {
        toast.success(
          enabled
            ? `${toUpdate.length} pravila aktivirano`
            : `${toUpdate.length} pravila deaktivirano`,
        );
        setSelectedRules([]);
        router.refresh();
      } else {
        toast.error("Greška pri ažuriranju nekih pravila");
      }
    } catch (error) {
      console.error("Failed to update accessory rules:", error);
      toast.error("Greška pri ažuriranju pravila");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Pravila za dodatke
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Automatsko generisanje dodatnih ploča i stavki za krojnu listu
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/accessory-rules/new">Dodaj pravilo</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rules}
        enableRowSelection
        getRowId={(row) => row.id}
        searchPlaceholder="Pretraži po nazivu..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={page - 1}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        onRowClick={(row) => router.push(`/admin/accessory-rules/${row.id}`)}
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
                  onClick={() => handleBulkEnabled(selected, true)}
                >
                  Aktiviraj
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkEnabled(selected, false)}
                >
                  Deaktiviraj
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedRules(selected);
                    setShowDeleteDialog(true);
                  }}
                >
                  Obriši
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši izabrana pravila?</AlertDialogTitle>
            <AlertDialogDescription>
              Obrisaćete {selectedRules.length} pravila za dodatke. Ova akcija
              se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
