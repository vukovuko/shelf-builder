"use client";

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type Order = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  status: "open" | "archived" | "cancelled";
  paymentStatus:
    | "unpaid"
    | "pending"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillmentStatus:
    | "unfulfilled"
    | "in_progress"
    | "on_hold"
    | "scheduled"
    | "partially_fulfilled"
    | "fulfilled";
  createdAt: string;
  updatedAt: string;
};

const statusLabels: Record<Order["status"], string> = {
  open: "Otvoren",
  archived: "Arhiviran",
  cancelled: "Otkazan",
};

const statusColors: Record<Order["status"], string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const paymentLabels: Record<Order["paymentStatus"], string> = {
  unpaid: "Neplaćeno",
  pending: "Na čekanju",
  partially_paid: "Delim. plaćeno",
  paid: "Plaćeno",
  partially_refunded: "Delim. refundirano",
  refunded: "Refundirano",
  voided: "Poništeno",
};

const paymentColors: Record<Order["paymentStatus"], string> = {
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  partially_paid:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partially_refunded:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  voided: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const fulfillmentLabels: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "Neizvršeno",
  in_progress: "U toku",
  on_hold: "Na čekanju",
  scheduled: "Zakazano",
  partially_fulfilled: "Delim. izvršeno",
  fulfilled: "Izvršeno",
};

const fulfillmentColors: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  on_hold:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  scheduled:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  partially_fulfilled:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fulfilled:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center w-12">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Izaberi sve"
        />
      </div>
    ),
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | { lastClickedIndexRef: React.MutableRefObject<number | null> }
        | undefined;

      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.shiftKey && meta && meta.lastClickedIndexRef.current !== null) {
          // Shift+click: select range
          const start = Math.min(meta.lastClickedIndexRef.current, row.index);
          const end = Math.max(meta.lastClickedIndexRef.current, row.index);
          const rows = table.getRowModel().rows;

          for (let i = start; i <= end; i++) {
            rows[i].toggleSelected(true);
          }
        } else {
          // Normal click: toggle single row
          row.toggleSelected(!row.getIsSelected());
        }

        if (meta) {
          meta.lastClickedIndexRef.current = row.index;
        }
      };

      return (
        <div className="flex items-center justify-center w-12">
          <Checkbox
            checked={row.getIsSelected()}
            onClick={handleClick}
            aria-label="Izaberi red"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "orderNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => `#${row.original.orderNumber}`,
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Korisnik
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.customerName || "-"}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.customerEmail}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Order["status"];
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            statusColors[status],
          )}
        >
          {statusLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentStatus",
    header: "Plaćanje",
    cell: ({ row }) => {
      const status = row.getValue("paymentStatus") as Order["paymentStatus"];
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            paymentColors[status],
          )}
        >
          {paymentLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "fulfillmentStatus",
    header: "Isporuka",
    cell: ({ row }) => {
      const status = row.getValue(
        "fulfillmentStatus",
      ) as Order["fulfillmentStatus"];
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            fulfillmentColors[status],
          )}
        >
          {fulfillmentLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Datum
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
  },
];
