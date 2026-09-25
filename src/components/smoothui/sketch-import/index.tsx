import { ArrowRight, Camera, ListChecks, ScanLine } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/PendingContent";
import { Button } from "@/components/ui/button";

const points = [
  {
    icon: Camera,
    text: "Skica na papiru, tabli ili salveti, ili fotografija ormana koji vam se dopada. Može i pod uglom, dovoljno je da se vide kolone i police.",
  },
  {
    icon: ScanLine,
    text: "Konfigurator prepozna kolone, police, fioke, šipke i vrata. Ako na skici napišete mere, uzima i njih.",
  },
  {
    icon: ListChecks,
    text: "Šta ne može da se izradi, uskladi sa pravilima izrade i pokaže vam šta je promenio. Dalje menjate sve kao i inače.",
  },
];

/** Hand-drawn sketch on the left, the wardrobe it becomes on the right. */
function SketchToWardrobe() {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      <svg
        aria-hidden="true"
        className="h-48 w-auto sm:h-56"
        fill="none"
        viewBox="0 0 150 190"
      >
        <rect
          className="fill-background stroke-border"
          height="186"
          rx="10"
          width="146"
          x="2"
          y="2"
        />
        <g
          className="stroke-foreground/55"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M22 26 C60 24 95 27 129 25 M129 25 C131 70 128 120 130 165 M130 165 C95 167 58 164 21 166 M21 166 C23 120 20 70 22 26" />
          <path d="M58 26 C57 70 59 120 57 165 M94 25 C95 70 93 120 95 166" />
          <path d="M23 64 C35 63 45 65 57 63 M22 102 C34 101 46 103 57 101 M22 138 C34 137 45 139 57 137" />
          <path d="M63 40 C73 39 81 41 90 39 M71 40 L71 36 M82 40 L82 36" />
          <path d="M95 120 C107 119 118 121 129 119 M95 142 C107 141 118 143 130 141" />
          <path d="M108 131 L116 131 M108 153 L116 153" />
        </g>
        <g className="fill-foreground/45" fontFamily="cursive" fontSize="11">
          <text x="64" y="56">
            šipka
          </text>
          <text x="101" y="112">
            fioke
          </text>
          <text x="32" y="182">
            240 × 60
          </text>
        </g>
      </svg>

      <ArrowRight className="size-6 shrink-0 text-primary" />

      <svg
        aria-hidden="true"
        className="h-48 w-auto sm:h-56"
        fill="none"
        viewBox="0 0 150 190"
      >
        <rect
          className="fill-primary/5 stroke-primary/20"
          height="186"
          rx="10"
          width="146"
          x="2"
          y="2"
        />
        <g className="stroke-foreground/70" strokeWidth="2.5">
          <rect
            className="fill-background"
            height="140"
            width="108"
            x="21"
            y="25"
          />
          <path d="M57 25 V165 M93 25 V165" />
          <path d="M21 63 H57 M21 101 H57 M21 139 H57" />
          <path d="M93 119 H129 M93 142 H129" />
        </g>
        <g className="stroke-primary" strokeLinecap="round" strokeWidth="3">
          <path d="M62 38 H88" />
          <path d="M106 131 H116 M106 154 H116" />
        </g>
        <path className="fill-primary/15" d="M22.5 26.5 H55.5 V61.5 H22.5 Z" />
      </svg>
    </div>
  );
}

export function SketchImport() {
  return (
    <section className="py-8 lg:py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm">
              Novo
            </span>
            <p className="mb-4 font-bold text-3xl text-foreground lg:text-4xl">
              Imate skicu ili sliku ormana?
            </p>
            <p className="mb-8 max-w-xl text-foreground/70 text-lg">
              Nacrtajte orman na papiru ili uslikajte onaj koji vam se dopada.
              Konfigurator od slike napravi početni dizajn, a vi ga dalje
              menjate u 3D.
            </p>

            <ul className="mb-8 space-y-4">
              {points.map((point) => (
                <li key={point.text} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <point.icon className="size-4 text-primary" />
                  </div>
                  <p className="text-foreground/70 text-sm leading-relaxed">
                    {point.text}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/design">
                  <LinkPending>Učitajte skicu</LinkPending>
                </Link>
              </Button>
              <p className="text-foreground/60 text-sm">
                Potrebno je da budete prijavljeni.
              </p>
            </div>
          </div>

          <SketchToWardrobe />
        </div>
      </div>
    </section>
  );
}

export default SketchImport;
