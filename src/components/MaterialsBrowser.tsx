"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { MaterialCard, type MaterialCardData } from "@/components/MaterialCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { foldForSearch, type MaterialKind } from "@/lib/material-pages";
import { cn } from "@/lib/utils";

export interface BrowserMaterial extends MaterialCardData {
  kind: MaterialKind;
  /** Name, code and brand, lowercased without diacritics. */
  search: string;
  /** popularRank from the admin; null for most decors. */
  rank: number | null;
}

type KindFilter = "all" | MaterialKind;
type Sort = "popular" | "price-asc" | "price-desc";

const KIND_LABELS: Record<KindFilter, string> = {
  all: "Sve",
  board: "Ploče",
  back: "Leđa",
};

const SORT_LABELS: Record<Sort, string> = {
  popular: "Popularno",
  "price-asc": "Cena: od najniže",
  "price-desc": "Cena: od najviše",
};

function decorCount(n: number): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? "dekor" : "dekora"}`;
}

/**
 * The full list is rendered on the server, so every decor link is in the
 * HTML for search engines; search, type and sort only narrow it down here.
 * Filters live in the query string (?q=, ?vrsta=, ?sort=) so a filtered
 * view can be shared.
 */
export function MaterialsBrowser({ items }: { items: BrowserMaterial[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [urlRead, setUrlRead] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    const v = params.get("vrsta");
    if (v === "board" || v === "back") setKind(v);
    const s = params.get("sort");
    if (s === "price-asc" || s === "price-desc") setSort(s);
    setUrlRead(true);
  }, []);

  useEffect(() => {
    if (!urlRead) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (kind !== "all") params.set("vrsta", kind);
    if (sort !== "popular") params.set("sort", sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, [urlRead, query, kind, sort]);

  const counts = useMemo(
    () => ({
      all: items.length,
      board: items.filter((m) => m.kind === "board").length,
      back: items.filter((m) => m.kind === "back").length,
    }),
    [items],
  );

  const shown = useMemo(() => {
    // Serbian adjectives change their last vowel (siva/sivi/sivo, bela/beli),
    // so longer words match without it.
    const tokens = foldForSearch(deferredQuery)
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => (t.length >= 4 ? t.replace(/[aeiou]$/, "") : t));
    const result = items.filter((m) => {
      if (kind !== "all" && m.kind !== kind) return false;
      if (tokens.length === 0) return true;
      // Codes are typed with or without spaces: "h1344 st32", "h1344st32".
      const compact = m.search.replace(/\s+/g, "");
      return tokens.every((t) => m.search.includes(t) || compact.includes(t));
    });
    // Items arrive sorted by name; the stable sort keeps that order after
    // the ranked decors.
    if (sort === "popular") {
      result.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    }
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    return result;
  }, [items, deferredQuery, kind, sort]);

  return (
    <>
      <div className="sticky top-0 z-20 -mx-6 mt-6 border-b bg-background/90 px-6 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:max-w-sm md:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Naziv ili šifra"
              aria-label="Pretraga materijala"
              className="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Obriši pretragu"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-0.5">
              {(Object.keys(KIND_LABELS) as KindFilter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                    kind === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {KIND_LABELS[k]}{" "}
                  <span className="hidden tabular-nums opacity-70 sm:inline">
                    {counts[k]}
                  </span>
                </button>
              ))}
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger
                className="ml-auto w-40 sm:w-44"
                aria-label="Sortiranje"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground tabular-nums md:ml-auto">
            {decorCount(shown.length)}
          </p>
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((m) => (
            <MaterialCard key={m.id} card={m} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">
            Nema dekora za „{deferredQuery}“
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setKind("all");
            }}
          >
            Obriši pretragu
          </Button>
        </div>
      )}
    </>
  );
}
