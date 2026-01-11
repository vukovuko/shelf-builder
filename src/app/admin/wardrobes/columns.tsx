"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export type Wardrobe = {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
};

export const columns: ColumnDef<Wardrobe>[] = [
  {
    accessorKey: "thumbnail",
    header: "",
    cell: ({ row }) => {
      const thumbnail = row.getValue("thumbnail") as string | null;
      if (!thumbnail) {
        return (
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground">-</span>
          </div>
        );
      }
      return (
        <div className="w-12 h-12 relative rounded overflow-hidden">
          <Image
            src={thumbnail}
            alt="Thumbnail"
            fill
            className="object-cover"
          />
        </div>
      );
    },
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
    cell: ({ row }) => {
      return <span className="font-medium">{row.getValue("name")}</span>;
    },
  },
  {
    accessorKey: "userName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Vlasnik
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("userName") as string | null;
      const email = row.original.userEmail;
      return (
        <div>
          <p className="font-medium">{name || "Nepoznat"}</p>
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>
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
          Kreiran
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleDateString("sr-RS");
    },
  },
];
