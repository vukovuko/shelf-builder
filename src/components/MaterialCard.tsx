import Link from "next/link";
import {
  cleanMaterialName,
  formatPricePerM2,
  type MaterialPageData,
  materialSlug,
} from "@/lib/material-pages";

export function MaterialCard({ material }: { material: MaterialPageData }) {
  const name = cleanMaterialName(material.name);
  return (
    <Link
      href={`/materijali/${materialSlug(material)}`}
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
        {material.img && (
          // Straight from R2 like the configurator's picker: 500+ decors
          // through the Next optimizer would use up the Vercel image quota.
          <img
            src={material.img}
            alt={`Dekor ${name}`}
            width={1000}
            height={1000}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <p className="mt-2 text-sm font-medium leading-snug group-hover:text-primary">
        {name}
      </p>
      <p className="text-xs text-muted-foreground">{material.productCode}</p>
      <p className="text-xs text-muted-foreground">
        {formatPricePerM2(material.price)}
      </p>
    </Link>
  );
}
