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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgacijaItem, PricePlan } from "@/lib/agacija-prices";
import { cn } from "@/lib/utils";

type Action = "preview" | "apply-prices" | "add-products";
type NewProduct = AgacijaItem & { image: string };
type Result = PricePlan & {
  supplierItems: number;
  added: number;
  newProducts: NewProduct[];
};

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
  const [loading, setLoading] = useState<Action | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const marginNumber = Number(margin);
  const marginValid =
    margin.trim() !== "" &&
    Number.isInteger(marginNumber) &&
    marginNumber >= 0 &&
    marginNumber <= 300;

  async function run(action: Action) {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/materials/agacija-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marginPercent: marginNumber,
          action,
          codes: action === "add-products" ? [...selected] : undefined,
        }),
      });
      const body: Result = await res.json();
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? "Greška");
      }
      if (action === "apply-prices") {
        toast.success(`Cene ažurirane za ${body.changes.length} materijala`);
        setResult({
          ...body,
          changes: [],
          unchanged: body.unchanged + body.changes.length,
        });
        router.refresh();
      } else {
        if (action === "add-products") {
          toast.success(`Dodato kao draft: ${body.added}`);
          setSelected(new Set());
        }
        setResult(body);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Greška");
    } finally {
      setLoading(null);
      setConfirmOpen(false);
    }
  }

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const changes = [...(result?.changes ?? [])].sort(
    (a, b) =>
      Math.abs(changePercent(b.oldPrice, b.newPrice)) -
      Math.abs(changePercent(a.oldPrice, a.newPrice)),
  );
  const ownMargins = changes.filter((c) => c.ownMargin).length;

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
            <Label htmlFor="margin">Globalna marža (%)</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={300}
              step={1}
              value={margin}
              onChange={(e) => {
                setMargin(e.target.value);
                setResult(null);
              }}
              className="w-32"
            />
          </div>
          <Button
            onClick={() => run("preview")}
            disabled={!marginValid || loading !== null}
          >
            {loading === "preview" && <Loader2 className="animate-spin" />}
            Prikaži promene
          </Button>
        </div>
        {/* Says what the margin is applied to, since both prices change. */}
        <p className="text-sm text-muted-foreground">
          Nabavna cena = cena sa Agacije. Prodajna cena = cena sa Agacije +
          marža. Materijal sa svojom maržom (u formi materijala) koristi nju
          umesto globalne.
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
            <span className="rounded-full bg-muted px-3 py-1">
              Novo na Agaciji: {result.newProducts.length}
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
                        Marža
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
                          <td
                            className={cn(
                              "px-4 py-2 text-right tabular-nums",
                              c.ownMargin && "font-medium text-primary",
                            )}
                          >
                            {c.marginPercent}%
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

          {ownMargins > 0 && (
            <p className="text-sm text-muted-foreground">
              Sopstvenu maržu ima {ownMargins} materijala (istaknuto u koloni
              Marža).
            </p>
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

          {result.newProducts.length > 0 && (
            <section className="space-y-3 pt-4">
              <h2 className="text-lg font-semibold">
                Novo na Agaciji ({result.newProducts.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Izabrani se dodaju kao draft, sa cenom sa Agacije + globalnom
                maržom. Kupci ih vide tek kad ih objavite.
              </p>
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {result.newProducts.map((p) => (
                      <tr key={p.code} className="hover:bg-muted/40">
                        <td className="w-10 px-4 py-2">
                          <Checkbox
                            id={`new-${p.code}`}
                            checked={selected.has(p.code)}
                            onCheckedChange={() => toggle(p.code)}
                          />
                        </td>
                        <td className="w-14 py-2">
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            className="size-10 rounded border object-cover"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <label
                            htmlFor={`new-${p.code}`}
                            className="cursor-pointer"
                          >
                            {p.name}
                            <span className="ml-2 text-muted-foreground">
                              {p.code}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {fmt(Math.round(p.price))} RSD/m²
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Button
                variant="outline"
                onClick={() => run("add-products")}
                disabled={selected.size === 0 || loading !== null}
              >
                {loading === "add-products" && (
                  <Loader2 className="animate-spin" />
                )}
                Dodaj izabrane kao draft ({selected.size})
              </Button>
            </section>
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
              Nove cene važe na sajtu odmah, uz globalnu maržu od {marginNumber}
              % (materijali sa svojom maržom zadržavaju nju). Postojeće
              porudžbine zadržavaju stare cene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>
              Otkaži
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run("apply-prices");
              }}
              disabled={loading !== null}
            >
              {loading === "apply-prices" && (
                <Loader2 className="animate-spin" />
              )}
              Primeni
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
