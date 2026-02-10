"use client";

import { Card } from "@/components/ui/card";
import {
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
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import type { PresetKey } from "@/lib/date-range-utils";

// --- Analytics types ---

interface AnalyticsStat {
  value: number;
  prevValue: number;
  data: { value: number }[];
}

interface Analytics {
  sessions: AnalyticsStat;
  revenue: AnalyticsStat;
  orders: AnalyticsStat;
  conversionRate: { value: number };
}

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
  analytics: Analytics;
  dateRange: {
    from: string;
    to: string;
    presetKey: PresetKey | null;
  };
}

// --- Helpers ---

function calcChange(
  current: number,
  previous: number,
): { percent: number; isPositive: boolean; isZero: boolean } {
  if (previous === 0 && current === 0)
    return { percent: 0, isPositive: false, isZero: true };
  if (previous === 0)
    return { percent: 100, isPositive: current > 0, isZero: false };
  const percent = ((current - previous) / previous) * 100;
  return {
    percent: Math.abs(percent),
    isPositive: percent >= 0,
    isZero: false,
  };
}

function formatRevenue(v: number): string {
  if (v >= 1_000_000) return `RSD ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RSD ${(v / 1_000).toFixed(1)}K`;
  return `RSD ${v.toLocaleString("sr-RS")}`;
}

// --- Sparkline ---

function Sparkline({
  data,
  color,
}: {
  data: { value: number }[];
  color: string;
}) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width={80} height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- Stat Card ---

function StatCard({
  label,
  value,
  prevValue,
  data,
  format,
}: {
  label: string;
  value: number;
  prevValue?: number;
  data?: { value: number }[] | null;
  format: (v: number) => string;
}) {
  const change = prevValue !== undefined ? calcChange(value, prevValue) : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-semibold mt-1 text-primary">
            {format(value)}
          </p>
          {change && (
            <p
              className={`text-xs mt-1 ${
                change.isZero
                  ? "text-muted-foreground"
                  : change.isPositive
                    ? "text-purple-700"
                    : "text-red-600"
              }`}
            >
              {change.isZero
                ? "\u2014"
                : `${change.isPositive ? "\u2191" : "\u2193"} ${change.percent.toFixed(1)}%`}
            </p>
          )}
        </div>
        {data && data.length > 0 && (
          <div className="text-chart-1">
            <Sparkline data={data} color="currentColor" />
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Main Dashboard ---

export function AdminDashboard({
  user,
  stats,
  analytics,
  dateRange,
}: AdminDashboardProps) {
  const currentRange = {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Dobrodošli, {user.name}</h1>
        <p className="text-muted-foreground">Pregled admin panela</p>
      </div>

      {/* Analytics Cards */}
      <div>
        <div className="mb-3">
          <DateRangePicker
            currentRange={currentRange}
            currentPreset={dateRange.presetKey}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Sesije"
            value={analytics.sessions.value}
            prevValue={analytics.sessions.prevValue}
            data={analytics.sessions.data}
            format={(v) => v.toLocaleString("sr-RS")}
          />
          <StatCard
            label="Ukupna prodaja"
            value={analytics.revenue.value}
            prevValue={analytics.revenue.prevValue}
            data={analytics.revenue.data}
            format={formatRevenue}
          />
          <StatCard
            label="Porudžbine"
            value={analytics.orders.value}
            prevValue={analytics.orders.prevValue}
            data={analytics.orders.data}
            format={(v) => v.toLocaleString("sr-RS")}
          />
          <StatCard
            label="Konverzija"
            value={analytics.conversionRate.value}
            data={null}
            format={(v) => `${v.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/users">
          <Card className="group p-6 transition-colors cursor-pointer hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <ShoppingCart
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <FolderOpen
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <Layers
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <BookOpen
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <DoorOpen
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
                <Scale
                  className="h-6 w-6 text-muted-foreground group-hover:text-foreground"
                  strokeWidth={1}
                />
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
