"use client";

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ACCESSORY_RULE_TARGET_LABELS,
  type AccessoryRuleTarget,
} from "@/lib/accessory-rules";

export type AccessoryRuleRow = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  target: AccessoryRuleTarget;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: unknown;
    logicOperator?: "AND" | "OR";
  }>;
  config: {
    itemName: string;
    materialType?: "korpus" | "front" | "back";
    widthFormula: string;
    heightFormula: string;
    quantity?: number | string;
  };
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<AccessoryRuleRow>[] = [
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
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Naziv
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "target",
    header: "Target",
    cell: ({ row }) => {
      const target = row.getValue("target") as AccessoryRuleTarget;
      return <div>{ACCESSORY_RULE_TARGET_LABELS[target]}</div>;
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Prioritet
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("priority")}</div>
    ),
  },
  {
    accessorKey: "conditions",
    header: "Uslovi",
    cell: ({ row }) => {
      const conditions = row.getValue(
        "conditions",
      ) as AccessoryRuleRow["conditions"];
      return (
        <div className="text-sm text-muted-foreground">
          {conditions.length} uslov{conditions.length === 1 ? "" : "a"}
        </div>
      );
    },
  },
  {
    accessorKey: "config",
    header: "Generiše",
    cell: ({ row }) => {
      const config = row.getValue("config") as AccessoryRuleRow["config"];
      return (
        <div className="text-sm text-muted-foreground max-w-[220px] truncate">
          {config.itemName} ({config.widthFormula} × {config.heightFormula})
        </div>
      );
    },
  },
];
