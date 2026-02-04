"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  DropdownMenuSeparator,
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
import { columns, type Order } from "./columns";

interface OrdersClientProps {
  orders: Order[];
  page: number;
  pageSize: number;
  totalCount: number;
  search: string;
}

export function OrdersClient({
  orders,
  page,
  pageSize,
  totalCount,
  search,
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Generic bulk update handler
  const handleBulkUpdate = useCallback(
    async (
      orders: Order[],
      updates: Partial<
        Pick<Order, "status" | "paymentStatus" | "fulfillmentStatus">
      >,
      filterFn: (order: Order) => boolean,
      successMessage: string,
    ) => {
      const ordersToUpdate = orders.filter(filterFn);
      if (ordersToUpdate.length === 0) {
        toast.info("Sve izabrane porudžbine su već u tom statusu");
        return;
      }

      setIsBulkUpdating(true);
      try {
        const results = await Promise.all(
          ordersToUpdate.map((order) =>
            fetch(`/api/admin/orders/${order.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }),
          ),
        );

        const successCount = results.filter((r) => r.ok).length;
        if (successCount === ordersToUpdate.length) {
          toast.success(`${successCount} ${successMessage}`);
        } else if (successCount > 0) {
          toast.warning(
            `${successCount}/${ordersToUpdate.length} ${successMessage}`,
          );
        } else {
          toast.error("Greška pri ažuriranju porudžbina");
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to update orders:", error);
        toast.error("Greška pri ažuriranju porudžbina");
      } finally {
        setIsBulkUpdating(false);
        setSelectedOrders([]);
      }
    },
    [router],
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  // Debounced search - updates URL after 300ms of no typing
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

  async function handleBulkArchive() {
    await handleBulkUpdate(
      selectedOrders,
      { status: "archived" },
      (order) => order.status !== "archived",
      "porudžbina arhivirano",
    );
    setShowArchiveDialog(false);
  }

  // Bulk payment status handlers
  const handleMarkAsPaid = (selected: Order[]) => {
    handleBulkUpdate(
      selected,
      { paymentStatus: "paid" },
      (order) => order.paymentStatus !== "paid",
      "porudžbina označeno kao plaćeno",
    );
  };

  const handleMarkAsUnpaid = (selected: Order[]) => {
    handleBulkUpdate(
      selected,
      { paymentStatus: "unpaid" },
      (order) => order.paymentStatus !== "unpaid",
      "porudžbina označeno kao neplaćeno",
    );
  };

  // Bulk fulfillment status handlers
  const handleMarkAsFulfilled = (selected: Order[]) => {
    handleBulkUpdate(
      selected,
      { fulfillmentStatus: "fulfilled" },
      (order) => order.fulfillmentStatus !== "fulfilled",
      "porudžbina označeno kao izvršeno",
    );
  };

  const handleMarkAsUnfulfilled = (selected: Order[]) => {
    handleBulkUpdate(
      selected,
      { fulfillmentStatus: "unfulfilled" },
      (order) => order.fulfillmentStatus !== "unfulfilled",
      "porudžbina označeno kao neizvršeno",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Porudžbine</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje porudžbinama
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/orders/new">Dodaj porudžbinu</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Pretrazi po korisniku ili broju..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        pageIndex={Math.max(page - 1, 0)}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
        enableRowSelection
        getRowId={(order) => order.id}
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
                <Button variant="ghost" size="icon" disabled={isBulkUpdating}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => handleMarkAsPaid(selected)}
                  disabled={isBulkUpdating}
                >
                  Označi kao plaćeno
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleMarkAsUnpaid(selected)}
                  disabled={isBulkUpdating}
                >
                  Označi kao neplaćeno
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleMarkAsFulfilled(selected)}
                  disabled={isBulkUpdating}
                >
                  Označi kao izvršeno
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleMarkAsUnfulfilled(selected)}
                  disabled={isBulkUpdating}
                >
                  Označi kao neizvršeno
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrders(selected);
                    setShowArchiveDialog(true);
                  }}
                  disabled={isBulkUpdating}
                >
                  Arhiviraj izabrane
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arhivirati porudžbine?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOrders.length} porudžbina će biti arhivirano. Možete ih
              kasnije vratiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkUpdating}>
              Otkaži
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkArchive}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? "Arhiviranje..." : "Arhiviraj"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
