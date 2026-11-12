import {
  type MaterialCardData,
  toMaterialCard,
} from "@/components/MaterialCard";
import type { BrowserMaterial } from "@/components/MaterialsBrowser";
import {
  getPublicHandleModels,
  type HandlePageModel,
} from "@/lib/handle-pages-data";
import {
  codeFromSlug,
  foldForSearch,
  type MaterialPageData,
  materialBrand,
  materialCodeSlug,
  materialKind,
  materialSlug,
  similarMaterials,
} from "@/lib/material-pages";
import { getPublicMaterials } from "@/lib/material-pages-data";
import { cachedCatalogData } from "./edge-cache.server";

// What the public catalog pages show. Each function returns only what its
// page renders: the full material and handle lists stay on the server.

// Every catalog page starts from one of these two lists, read whole.
export const publicMaterials = () =>
  cachedCatalogData("materials", getPublicMaterials);
export const publicHandleModels = () =>
  cachedCatalogData("handle-models", getPublicHandleModels);

export async function loadMaterialBrowserItems(): Promise<BrowserMaterial[]> {
  const all = await publicMaterials();
  return all.flatMap((material) => {
    const kind = materialKind(material);
    if (!kind) return [];
    const card = toMaterialCard(material);
    const brand = materialBrand(material) ?? "";
    return [
      {
        ...card,
        kind,
        rank: material.popularRank,
        search: foldForSearch(`${card.name} ${card.code ?? ""} ${brand}`),
      },
    ];
  });
}

export interface MaterialPage {
  material: MaterialPageData;
  /** The material's current URL; a renamed decor is redirected to it. */
  slug: string;
  similar: MaterialCardData[];
}

export async function loadMaterialPage(
  slug: string,
): Promise<MaterialPage | null> {
  const all = await publicMaterials();
  // The code finds the material; the name before it is only for people.
  const code = codeFromSlug(slug);
  const material = all.find((m) => materialCodeSlug(m) === code);
  if (!material) return null;
  return {
    material,
    slug: materialSlug(material),
    similar: similarMaterials(material, all).map(toMaterialCard),
  };
}

export function loadHandleModels(): Promise<HandlePageModel[]> {
  return publicHandleModels();
}

export interface HandlePage {
  model: HandlePageModel;
  similar: HandlePageModel[];
}

export async function loadHandlePage(slug: string): Promise<HandlePage | null> {
  const all = await publicHandleModels();
  const model = all.find((m) => m.slug === slug);
  if (!model) return null;
  const similar = all
    .filter((m) => m.kind === model.kind && m.key !== model.key)
    .sort(
      (a, b) =>
        Math.abs(a.minPrice - model.minPrice) -
        Math.abs(b.minPrice - model.minPrice),
    )
    .slice(0, 6);
  return { model, similar };
}
