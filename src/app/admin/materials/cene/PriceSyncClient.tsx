"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PricePlan } from "@/lib/agacija-prices";
import { cn } from "@/lib/utils";

type Result = PricePlan & { applied: boolean; supplierItems: number };

const fmt = (n: number) => n.toLocaleString("sr-RS");

function changePercent(oldPrice: number, newPrice: number): number {
  return oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 100;
}

export function PriceSyncClient({
  initialMargin,
  syncedAt,
}: {
  initialMargin: number;
  syncedAt: string | null;
}) {
  const router = useRouter();
  const [margin, setMargin] = useState(String(initialMargin));
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const marginNumber = Number(margin.replace(",", "."));
  const marginValid =
    margin.trim() !== "" &&
    Number.isFinite(marginNumber) &&
    marginNumber >= 0 &&
    marginNumber <= 300;

  async function run(apply: boolean) {
    setLoading(apply ? "apply" : "preview");
    try {
      const res = await fetch("/api/admin/materials/agacija-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginPercent: marginNumber, apply }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Greška");
      if (apply) {
        toast.success(`Cene ažurirane za ${body.changes.length} materijala`);
        router.refresh();
        setResult({
          ...body,
          changes: [],
          unchanged: body.unchanged + body.changes.length,
        });
      } else {
        setResult(body);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Greška");
    } finally {
      setLoading(null);
      setConfirmOpen(false);
    }
  }

  const changes = [...(result?.changes ?? [])].sort(
    (a, b) =>
      Math.abs(changePercent(b.oldPrice, b.newPrice)) -
      Math.abs(changePercent(a.oldPrice, a.newPrice)),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/materials"
          className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Materijali
        </Link>
        <h1 className="text-2xl font-semibold sm:text-3xl">Cene sa Agacije</h1>
        <p className="text-sm text-muted-foreground">
          {syncedAt
            ? `Poslednje ažuriranje: ${new Date(syncedAt).toLocaleString("sr-RS")}`
            : "Cene još nisu ažurirane sa Agacije."}
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="margin">Marža (%)</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={300}
              step={0.5}
              value={margin}
              onChange={(e) => {
                setMargin(e.target.value);
                setResult(null);
              }}
              className="w-32"
            />
          </div>
          <Button
            onClick={() => run(false)}
            disabled={!marginValid || loading !== null}
          >
            {loading === "preview" && <Loader2 className="animate-spin" />}
            Prikaži promene
          </Button>
        </div>
        {/* Says what the margin is applied to, since both prices change. */}
        <p className="text-sm text-muted-foreground">
          Nabavna cena = cena sa Agacije. Prodajna cena = cena sa Agacije +
          marža.
        </p>
      </Card>

      {result && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              Menja se: {result.changes.length}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Bez promene: {result.unchanged}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Nema na Agaciji: {result.notFound.length}
            </span>
          </div>

          {changes.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Materijal</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Agacija
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Stara cena
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Nova cena
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Razlika
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changes.map((c) => {
                      const pct = changePercent(c.oldPrice, c.newPrice);
                      return (
                        <tr key={c.id}>
                          <td className="px-4 py-2">
                            <Link
                              href={`/admin/materials/${c.id}`}
                              className="hover:underline"
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmt(c.supplierPrice)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {fmt(c.oldPrice)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">
                            {fmt(c.newPrice)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right tabular-nums",
                              pct > 0 ? "text-red-600" : "text-green-600",
                              Math.abs(pct) >= 25 && "font-bold",
                            )}
                          >
                            {pct > 0 ? "+" : ""}
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {result.notFound.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Nema na Agaciji ({result.notFound.length}), cene ostaju iste
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {result.notFound.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/admin/materials/${m.id}`}
                      className="hover:underline"
                    >
                      {m.name}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      {m.code ?? "bez šifre"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {result.changes.length > 0 && (
            <Button
              size="lg"
              onClick={() => setConfirmOpen(true)}
              disabled={loading !== null}
            >
              Primeni na {result.changes.length} materijala
            </Button>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Promeni cene za {result?.changes.length} materijala?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Nove cene važe na sajtu odmah, uz maržu od {marginNumber}%.
              Postojeće porudžbine zadržavaju stare cene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>
              Otkaži
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run(true);
              }}
              disabled={loading !== null}
            >
              {loading === "apply" && <Loader2 className="animate-spin" />}
              Primeni
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
