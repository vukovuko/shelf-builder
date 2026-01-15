"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, MoreHorizontal } from "lucide-react";
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
import { columns, type User } from "./columns";

interface UsersClientProps {
  users: User[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export function UsersClient({
  users,
  page,
  pageSize,
  totalCount,
}: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

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
        selectedUsers.map((user) =>
          fetch(`/api/admin/users/${user.id}`, { method: "DELETE" }),
        ),
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        toast.success(`${selectedUsers.length} korisnika obrisano`);
        router.refresh();
      } else {
        toast.error("Greška pri brisanju nekih korisnika");
      }
    } catch (error) {
      console.error("Failed to delete users:", error);
      toast.error("Greška pri brisanju korisnika");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedUsers([]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Korisnici</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje korisnicima sistema
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj korisnika
          </Link>
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={users}
        searchKey="email"
        searchPlaceholder="Pretrazi po emailu..."
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        enableRowSelection
        getRowId={(user) => user.id}
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
                    setSelectedUsers(selected);
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
            <AlertDialogTitle>Obrisati korisnike?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. {selectedUsers.length} korisnika i svi
              njihovi ormani će biti trajno obrisani.
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
