import { Card } from "@/components/ui/card";
import {
  Shield,
  Users,
  FolderOpen,
  ArrowRight,
  ShoppingCart,
  Layers,
  BookOpen,
  DoorOpen,
  Scale,
} from "lucide-react";
import Link from "next/link";

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  stats: {
    totalUsers: number;
    totalWardrobes: number;
    adminCount: number;
  };
}

export function AdminDashboard({ user, stats }: AdminDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dobrodošli, {user.name}</h1>
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
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Korisnici
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Upravljanje korisnicima
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/orders">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Porudžbine
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Pregled svih porudžbina
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/wardrobes">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Ormani
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Svi ormani korisnika
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/materials">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Materijali
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Upravljanje materijalima
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/models">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Modeli
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Upravljanje modelima
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/handles">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DoorOpen className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Ručke
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Upravljanje ručkama
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/admin/rules">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium group-hover:text-foreground">
                    Pravila
                  </p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                    Upravljanje pravilima
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
