"use client";

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ACTION_LABELS, type ActionType } from "@/lib/rules/types";

export type RuleRow = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: unknown;
    logicOperator?: "AND" | "OR";
  }>;
  actions: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<RuleRow>[] = [
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
    accessorKey: "enabled",
    header: "Status",
    cell: ({ row }) => {
      const enabled = row.getValue("enabled") as boolean;
      return (
        <div
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            enabled
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {enabled ? "Aktivno" : "Neaktivno"}
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
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return (
        <div className="text-muted-foreground text-sm max-w-[200px] truncate">
          {description || "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Prioritet
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("priority")}</div>
    ),
  },
  {
    accessorKey: "conditions",
    header: "Uslovi",
    cell: ({ row }) => {
      const conditions = row.getValue("conditions") as RuleRow["conditions"];
      return (
        <div className="text-sm text-muted-foreground">
          {conditions.length} uslov{conditions.length === 1 ? "" : "a"}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "actions",
    header: "Akcije",
    cell: ({ row }) => {
      const actions = row.getValue("actions") as RuleRow["actions"];
      const actionTypes = actions
        .map((a) => ACTION_LABELS[a.type as ActionType] || a.type)
        .join(", ");
      return (
        <div className="text-sm text-muted-foreground max-w-[150px] truncate">
          {actionTypes || "-"}
        </div>
      );
    },
    enableSorting: false,
  },
];
