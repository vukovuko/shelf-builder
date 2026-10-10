import Link from "next/link";
import {
  cleanMaterialName,
  formatPricePerM2,
  type MaterialPageData,
  materialSlug,
} from "@/lib/material-pages";

/** What a material card shows, ready to render on the server or the client. */
export interface MaterialCardData {
  id: number;
  href: string;
  name: string;
  code: string | null;
  price: number;
  img: string | null;
}

export function toMaterialCard(material: MaterialPageData): MaterialCardData {
  return {
    id: material.id,
    href: `/materijali/${materialSlug(material)}`,
    name: cleanMaterialName(material.name),
    code: material.productCode,
    price: material.price,
    img: material.img,
  };
}

export function MaterialCard({ card }: { card: MaterialCardData }) {
  return (
    <Link
      href={card.href}
      className="group block [contain-intrinsic-size:auto_260px] [content-visibility:auto]"
    >
      <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
        {card.img && (
          // Straight from R2 like the configurator's picker: 500+ decors
          // through the Next optimizer would use up the Vercel image quota.
          <img
            src={card.img}
            alt={`Dekor ${card.name}`}
            width={1000}
            height={1000}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <p className="mt-2 text-sm font-medium leading-snug group-hover:text-primary">
        {card.name}
      </p>
      <p className="text-xs text-muted-foreground">{card.code}</p>
      <p className="text-xs text-muted-foreground">
        {formatPricePerM2(card.price)}
      </p>
    </Link>
  );
}
