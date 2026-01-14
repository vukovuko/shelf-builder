"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Mail, Calendar, FolderOpen, Trash2 } from "lucide-react";
import Link from "next/link";

interface Wardrobe {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  wardrobeCount: number;
  wardrobes: Wardrobe[];
}

interface UserDetailClientProps {
  user: UserData;
}

export function UserDetailClient({ user: initialUser }: UserDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Korisnik je obrisan");
        router.push("/admin/users");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri brisanju korisnika");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Greška pri brisanju korisnika");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRoleChange(newRole: string) {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });

      if (res.ok) {
        setUser((prev) => ({ ...prev, role: newRole }));
        toast.success("Uloga je promenjena");
      } else {
        const data = await res.json();
        toast.error(data.error || "Greška pri promeni uloge");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Greška pri promeni uloge");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{user.name}</h1>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting} className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Brisanje..." : "Obriši korisnika"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati korisnika?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Korisnik "{user.name}" i svi njegovi
                ormani će biti trajno obrisani.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Obriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informacije</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Registrovan</p>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString("sr-RS", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Broj ormana</p>
                <p className="font-medium">{user.wardrobeCount}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Role Card */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Uloga</h2>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Trenutna uloga</p>
            <Select
              value={user.role}
              onValueChange={handleRoleChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Korisnik</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                user.role === "admin"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {user.role === "admin" ? "Administrator" : "Korisnik"}
            </span>
          </div>
        </Card>
      </div>

      {/* User's Wardrobes */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Ormani korisnika</h2>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naziv</TableHead>
                <TableHead>Kreiran</TableHead>
                <TableHead>Ažuriran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.wardrobes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Korisnik nema ormana
                  </TableCell>
                </TableRow>
              ) : (
                user.wardrobes.map((wardrobe) => (
                  <TableRow key={wardrobe.id}>
                    <TableCell className="font-medium">
                      {wardrobe.name}
                    </TableCell>
                    <TableCell>
                      {new Date(wardrobe.createdAt).toLocaleDateString("sr-RS")}
                    </TableCell>
                    <TableCell>
                      {new Date(wardrobe.updatedAt).toLocaleDateString("sr-RS")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
