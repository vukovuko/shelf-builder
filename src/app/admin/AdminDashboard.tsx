"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Users, FolderOpen } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWardrobes: 0,
    adminCount: 0,
  });

  // Fetch users
  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/stats"),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast.error("Greška pri učitavanju podataka");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Update user role
  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        toast.success("Uloga je promenjena");
      } else {
        toast.error("Greška pri promeni uloge");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Greška pri promeni uloge");
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Dobrodošli, {user.name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ukupno korisnika</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <FolderOpen className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ukupno ormana</p>
              <p className="text-2xl font-bold">{stats.totalWardrobes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Admini</p>
              <p className="text-2xl font-bold">{stats.adminCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Korisnici</h2>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ime</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Uloga</TableHead>
                <TableHead>Datum registracije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Učitavanje...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nema korisnika
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(value) => handleRoleChange(u.id, value)}
                        disabled={u.id === user.id} // Can't change own role
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(u.createdAt).toLocaleDateString("sr-RS")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Back link */}
      <div className="mt-6">
        <Link href="/design">
          <Button variant="outline">← Nazad na dizajner</Button>
        </Link>
      </div>
    </div>
  );
}
