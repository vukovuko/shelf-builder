import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/db";
import { handleFinishes, handles } from "@/db/schema";
import {
  HANDLE_MODELS,
  type HandleModel,
  handleFinishLabel,
  handleModelSlug,
  handleSize,
  handleSizeOrder,
  modelForHandle,
} from "@/lib/handle-models";

/** One size + finish of a model, as the configurator identifies it. */
export interface HandleVariant {
  /** The configurator's handle and finish keys (legacyId, else the id). */
  handleKey: string;
  finishKey: string;
  size: string | null;
  sizeOrder: number;
  finish: string;
  price: number;
  image: string | null;
}

export interface HandlePageModel extends HandleModel {
  slug: string;
  variants: HandleVariant[];
  image: string | null;
  minPrice: number;
  maxPrice: number;
}

/** Published handles grouped by model. Purchase prices never leave the server. */
export const getPublicHandleModels = cache(
  async (): Promise<HandlePageModel[]> => {
    const [rows, finishes] = await Promise.all([
      db
        .select({
          id: handles.id,
          legacyId: handles.legacyId,
          name: handles.name,
          mainImage: handles.mainImage,
        })
        .from(handles)
        .where(eq(handles.published, true)),
      db
        .select({
          id: handleFinishes.id,
          handleId: handleFinishes.handleId,
          legacyId: handleFinishes.legacyId,
          name: handleFinishes.name,
          image: handleFinishes.image,
          price: handleFinishes.price,
        })
        .from(handleFinishes),
    ]);

    const variantsByModel = new Map<string, HandleVariant[]>();
    for (const handle of rows) {
      const model = modelForHandle(handle.id);
      if (!model) continue;
      for (const finish of finishes.filter((f) => f.handleId === handle.id)) {
        const list = variantsByModel.get(model.key) ?? [];
        list.push({
          handleKey: handle.legacyId || String(handle.id),
          finishKey: finish.legacyId || String(finish.id),
          size: handleSize(handle.name),
          sizeOrder: handleSizeOrder(handle.name),
          finish: handleFinishLabel(handle.name, finish.name),
          price: finish.price,
          image: finish.image ?? handle.mainImage,
        });
        variantsByModel.set(model.key, list);
      }
    }

    return HANDLE_MODELS.flatMap((model) => {
      const variants = (variantsByModel.get(model.key) ?? []).sort(
        (a, b) =>
          a.sizeOrder - b.sizeOrder || a.finish.localeCompare(b.finish, "sr"),
      );
      if (variants.length === 0) return [];
      const prices = variants.map((v) => v.price);
      return [
        {
          ...model,
          slug: handleModelSlug(model),
          variants,
          image: variants.find((v) => v.image)?.image ?? null,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
        },
      ];
    });
  },
);
