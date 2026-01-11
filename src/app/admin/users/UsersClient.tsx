"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { columns, type User } from "./columns";

interface UsersClientProps {
  users: User[];
}

export function UsersClient({ users }: UsersClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Korisnici</h1>
        <p className="text-muted-foreground">Upravljanje korisnicima sistema</p>
      </div>
      <DataTable
        columns={columns}
        data={users}
        searchKey="email"
        searchPlaceholder="Pretrazi po emailu..."
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
      />
    </div>
  );
}
