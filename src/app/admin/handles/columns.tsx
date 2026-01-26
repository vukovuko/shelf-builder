"use client";

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type HandleFinish = {
  id: number;
  handleId: number;
  legacyId: string | null;
  name: string;
  image: string | null;
  price: number;
  costPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type Handle = {
  id: number;
  legacyId: string | null;
  name: string;
  description: string | null;
  mainImage: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  finishes: HandleFinish[];
};

export const columns: ColumnDef<Handle>[] = [
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
          const start = Math.min(meta.lastClickedIndexRef.current, row.index);
          const end = Math.max(meta.lastClickedIndexRef.current, row.index);
          const rows = table.getRowModel().rows;

          for (let i = start; i <= end; i++) {
            rows[i].toggleSelected(true);
          }
        } else {
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
    accessorKey: "mainImage",
    header: "Slika",
    cell: ({ row }) => {
      const img = row.getValue("mainImage") as string | null;
      return img ? (
        <img
          src={img}
          alt={row.getValue("name")}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
          -
        </div>
      );
    },
    enableSorting: false,
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
    accessorKey: "description",
    header: "Opis",
    cell: ({ row }) => row.getValue("description") || "-",
  },
  {
    accessorKey: "finishes",
    header: "Završne obrade",
    cell: ({ row }) => {
      const finishes = row.getValue("finishes") as HandleFinish[];
      return (
        <span className="text-sm text-muted-foreground">
          {finishes.length} {finishes.length === 1 ? "obrada" : "obrada"}
        </span>
      );
    },
    enableSorting: false,
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
];
