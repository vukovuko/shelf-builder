"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type Material = {
	id: number;
	name: string;
	price: number;
	img: string | null;
	thickness: number | null;
	stock: number | null;
	category: string;
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
		cell: ({ row }) => (
			<div className="flex items-center justify-center w-12">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					onClick={(e) => e.stopPropagation()}
					aria-label="Izaberi red"
				/>
			</div>
		),
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
		accessorKey: "category",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Kategorija
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const category = row.getValue("category") as string;
			return (
				<div className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
					{category}
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
					Cena
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
		accessorKey: "stock",
		header: "Zaliha",
		cell: ({ row }) => {
			const stock = row.getValue("stock") as number | null;
			return stock ?? 0;
		},
	},
];
