"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Shield, Users, FolderOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWardrobes: 0,
    adminCount: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast.error("Greska pri ucitavanju statistike");
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dobrodosli, {user.name}</h1>
        <p className="text-muted-foreground">Pregled admin panela</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/users">
          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">Korisnici</p>
                  <p className="text-sm text-muted-foreground">
                    Upravljanje korisnicima
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/wardrobes">
          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">Ormani</p>
                  <p className="text-sm text-muted-foreground">
                    Svi ormani korisnika
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
