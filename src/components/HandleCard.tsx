import Link from "next/link";
import type { HandlePageModel } from "@/lib/handle-pages-data";

export function formatHandlePrice(model: HandlePageModel): string {
  const price = model.minPrice.toLocaleString("sr-RS");
  return model.minPrice === model.maxPrice
    ? `${price} RSD/kom`
    : `od ${price} RSD/kom`;
}

export function HandleCard({ model }: { model: HandlePageModel }) {
  return (
    <Link href={`/rucke/${model.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-xl border bg-white p-4">
        {model.image && (
          // Product photos from the supplier, white background: contain, not crop.
          <img
            src={model.image}
            alt={model.name}
            loading="lazy"
            decoding="async"
            className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <p className="mt-2 text-sm font-medium leading-snug group-hover:text-primary">
        {model.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatHandlePrice(model)}
      </p>
    </Link>
  );
}
