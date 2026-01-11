"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { columns, type Wardrobe } from "./columns";

interface WardrobesClientProps {
  wardrobes: Wardrobe[];
}

export function WardrobesClient({ wardrobes }: WardrobesClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Ormani</h1>
        <p className="text-muted-foreground">Svi ormani svih korisnika</p>
      </div>
      <DataTable
        columns={columns}
        data={wardrobes}
        searchKey="name"
        searchPlaceholder="Pretrazi po nazivu..."
        onRowClick={(wardrobe) =>
          router.push(`/admin/users/${wardrobe.userId}`)
        }
      />
    </div>
  );
}
