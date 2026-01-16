"use client";

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type Material = {
  id: number;
  name: string;
  price: number;
  costPrice: number;
  img: string | null;
  thickness: number | null;
  stock: number | null;
  categories: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<Material>[] = [
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Naziv
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "published",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const published = row.getValue("published") as boolean;
      return (
        <div
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            published
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {published ? "Objavljeno" : "Draft"}
        </div>
      );
    },
  },
  {
    accessorKey: "thickness",
    header: "Debljina",
    cell: ({ row }) => {
      const thickness = row.getValue("thickness") as number | null;
      return thickness ? `${thickness}mm` : "-";
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Prodajna
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const price = row.getValue("price") as number;
      return `${price.toLocaleString("sr-RS")} RSD/m²`;
    },
  },
  {
    accessorKey: "costPrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nabavna
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const costPrice = row.getValue("costPrice") as number;
      return `${costPrice.toLocaleString("sr-RS")} RSD/m²`;
    },
  },
];
