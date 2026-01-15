import type { DoorOption } from "@/lib/store";

type PricingMaterial = {
  id: number;
  price: number;
  thickness: number | null;
  categories: string[];
};

type ElementConfig = {
  columns: number;
  rowCounts: number[];
};

type CompartmentExtras = {
  verticalDivider?: boolean;
  drawers?: boolean;
  drawersCount?: number;
  rod?: boolean;
  led?: boolean;
};

export type WardrobeSnapshot = {
  width: number;
  height: number;
  depth: number;
  selectedMaterialId: number;
  selectedBackMaterialId?: number | null;
  elementConfigs?: Record<string, ElementConfig>;
  compartmentExtras?: Record<string, CompartmentExtras>;
  doorSelections?: Record<string, DoorOption>;
  hasBase?: boolean;
  baseHeight?: number;
};

export type CutListItem = {
  code: string;
  desc: string;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  areaM2: number;
  cost: number;
  element: string;
};

export type CutList = {
  items: CutListItem[];
  grouped: Record<string, CutListItem[]>;
  totalArea: number;
  totalCost: number;
  pricePerM2: number;
};

const emptyCutList: CutList = {
  items: [],
  grouped: {},
  totalArea: 0,
  totalCost: 0,
  pricePerM2: 0,
};

export function calculateCutList(
  snapshot: WardrobeSnapshot,
  materials: PricingMaterial[],
): CutList {
  try {
    if (!snapshot || materials.length === 0) {
      return emptyCutList;
    }

    const elementConfigs = snapshot.elementConfigs ?? {};
    const compartmentExtras = snapshot.compartmentExtras ?? {};
    const doorSelections = snapshot.doorSelections ?? {};
    const hasBase = snapshot.hasBase ?? false;
    const baseHeight = snapshot.baseHeight ?? 0;

    const mat = materials.find(
      (m) => String(m.id) === String(snapshot.selectedMaterialId),
    );
    if (!mat) {
      return emptyCutList;
    }

    const pricePerM2 = Number(mat?.price ?? 0);
    const t = (Number(mat?.thickness ?? 18) / 1000) as number; // m
    const doorT = 18 / 1000; // m
    const clearance = 1 / 1000; // 1mm
    const doubleGap = 3 / 1000; // 3mm between double leaves

    // Back material price and thickness (5mm)
    const backId = snapshot.selectedBackMaterialId ?? null;
    // Find back material - by ID if selected, otherwise first material with "Leđa" in categories
    const backMat = materials.find((m) =>
      backId
        ? String(m.id) === String(backId)
        : m.categories.some(
            (c) => c.toLowerCase().includes("leđa") || c.toLowerCase().includes("ledja"),
          ),
    );
    const backPricePerM2 = Number(backMat?.price ?? 0);
    const backT = (Number(backMat?.thickness ?? 5) / 1000) as number;

    const w = snapshot.width / 100;
    const h = snapshot.height / 100;
    const d = snapshot.depth / 100;

    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(d) ||
      w <= 0 ||
      h <= 0 ||
      d <= 0
    ) {
      return emptyCutList;
    }

    const maxSegX = 100 / 100;
    const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
    const segWX = w / nBlocksX;
    const blocksX = Array.from({ length: nBlocksX }, (_, i) => {
      const start = -w / 2 + i * segWX;
      const end = start + segWX;
      return { start, end };
    });
    const targetBottomH = 200 / 100;
    const minTopH = 10 / 100;
    const modulesY: { yStart: number; yEnd: number }[] = [];
    if (h > 200 / 100) {
      const yStartBottom = -h / 2;
      const bottomH = h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
      const yEndBottom = yStartBottom + bottomH;
      const yStartTop = yEndBottom;
      const yEndTop = h / 2;
      modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
      modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
    } else {
      modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
    }
    const toLetters = (num: number) => {
      let n = num + 1;
      let s = "";
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    };

    const items: CutListItem[] = [];

    let idx = 0;
    modulesY.forEach((m, mIdx) => {
      const moduleH = m.yEnd - m.yStart;
      const doorH = Math.max(moduleH - clearance, 0);
      blocksX.forEach((bx) => {
        const letter = toLetters(idx);
        const elemW = bx.end - bx.start;
        const innerStartX = bx.start + t;
        const innerEndX = bx.end - t;
        const innerW = Math.max(innerEndX - innerStartX, 0);
        const suffix = `.${mIdx + 1}`;
        const yStartInner = m.yStart + t;
        const yEndInner = m.yEnd - t;

        // Sides
        const sideW = d;
        const sideH = moduleH;
        const sideArea = sideW * sideH;
        items.push({
          code: `A${letter}L${suffix}`,
          desc: `Leva stranica elementa ${letter}${suffix}`,
          widthCm: sideW * 100,
          heightCm: sideH * 100,
          thicknessMm: t * 1000,
          areaM2: sideArea,
          cost: sideArea * pricePerM2,
          element: letter,
        });
        items.push({
          code: `A${letter}D${suffix}`,
          desc: `Desna stranica elementa ${letter}${suffix}`,
          widthCm: sideW * 100,
          heightCm: sideH * 100,
          thicknessMm: t * 1000,
          areaM2: sideArea,
          cost: sideArea * pricePerM2,
          element: letter,
        });

        // Shelves per compartment
        const cfg = elementConfigs[letter] ?? { columns: 1, rowCounts: [0] };
        const cols = Math.max(1, (cfg.columns as number) | 0);
        const xs: number[] = [innerStartX];
        for (let c = 1; c <= cols - 1; c++)
          xs.push(innerStartX + (innerW * c) / cols);
        xs.push(innerEndX);
        const compWidths = xs.slice(0, -1).map((x0, cIdx) => {
          const x1 = xs[cIdx + 1];
          const left = x0 + (cIdx === 0 ? 0 : t / 2);
          const right = x1 - (cIdx === cols - 1 ? 0 : t / 2);
          return Math.max(right - left, 0);
        });
        let shelfSerial = 0;
        compWidths.forEach((compW, cIdx) => {
          const count = Math.max(
            0,
            Math.floor((cfg.rowCounts as number[] | undefined)?.[cIdx] ?? 0),
          );
          for (let s = 0; s < count; s++) {
            shelfSerial += 1;
            const area = compW * d;
            items.push({
              code: `A${letter}P.${shelfSerial}`,
              desc: `Polica ${letter} (komora ${cIdx + 1})`,
              widthCm: compW * 100,
              heightCm: d * 100,
              thicknessMm: t * 1000,
              areaM2: area,
              cost: area * pricePerM2,
              element: letter,
            });
          }
        });

        // Top and Bottom panels per element (like CarcassFrame)
        const innerLenX = Math.max(elemW - 2 * t, 0);
        if (innerLenX > 0) {
          const areaBot = innerLenX * d;
          items.push({
            code: `A${letter}B${suffix}`,
            desc: `Donja ploča ${letter}${suffix}`,
            widthCm: innerLenX * 100,
            heightCm: d * 100,
            thicknessMm: t * 1000,
            areaM2: areaBot,
            cost: areaBot * pricePerM2,
            element: letter,
          });
          const areaTop = innerLenX * d;
          items.push({
            code: `A${letter}G${suffix}`,
            desc: `Gornja ploča ${letter}${suffix}`,
            widthCm: innerLenX * 100,
            heightCm: d * 100,
            thicknessMm: t * 1000,
            areaM2: areaTop,
            cost: areaTop * pricePerM2,
            element: letter,
          });
        }

        // Internal vertical dividers from elementConfigs (between compartments)
        if (cols > 1) {
          // Compute drawers region to shorten divider height (same approach as CarcassFrame)
          const extrasForEl = compartmentExtras[
            letter as keyof typeof compartmentExtras
          ] as any;
          const drawerH = 10 / 100; // 10cm
          const gap = 1 / 100; // 1cm
          const per = drawerH + gap;
          const raiseByBase =
            hasBase && (modulesY.length === 1 || mIdx === 0)
              ? baseHeight / 100
              : 0;
          const drawersYStart = yStartInner + raiseByBase;
          const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
          const maxAuto = Math.max(
            0,
            Math.floor((innerHForDrawers + gap) / per),
          );
          const countFromState = Math.max(
            0,
            Math.floor(extrasForEl?.drawersCount ?? 0),
          );
          const usedDrawerCount = extrasForEl?.drawers
            ? countFromState > 0
              ? Math.min(countFromState, maxAuto)
              : maxAuto
            : 0;
          const drawersTopY =
            usedDrawerCount > 0
              ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
              : 0;
          const autoShelfExists =
            usedDrawerCount > 0 &&
            usedDrawerCount < maxAuto &&
            yEndInner - (drawersTopY + gap) >= t;
          let yDivFrom = yStartInner;
          if (usedDrawerCount > 0) {
            const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
            yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
          }
          const hDiv = Math.max(yEndInner - yDivFrom, 0);
          if (hDiv > 0) {
            for (let c = 1; c <= cols - 1; c++) {
              const area = d * hDiv;
              items.push({
                code: `A${letter}VD.${c}${suffix}`,
                desc: `Vertikalni divider ${letter} (između komora ${c}/${c + 1})`,
                widthCm: d * 100,
                heightCm: hDiv * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          }
        }

        // Doors
        const sel = doorSelections[
          letter as keyof typeof doorSelections
        ] as any;
        if (sel && sel !== "none") {
          const totalAvailW = Math.max(elemW - clearance, 0);
          if (sel === "double" || sel === "doubleMirror") {
            const leafW = Math.max((totalAvailW - doubleGap) / 2, 0);
            const area = leafW * doorH;
            items.push({
              code: `A${letter}V.L${suffix}`,
              desc: `Vrata leva ${letter}${suffix}`,
              widthCm: leafW * 100,
              heightCm: doorH * 100,
              thicknessMm: doorT * 1000,
              areaM2: area,
              cost: area * pricePerM2,
              element: letter,
            });
            items.push({
              code: `A${letter}V.D${suffix}`,
              desc: `Vrata desna ${letter}${suffix}`,
              widthCm: leafW * 100,
              heightCm: doorH * 100,
              thicknessMm: doorT * 1000,
              areaM2: area,
              cost: area * pricePerM2,
              element: letter,
            });
          } else {
            const leafW = totalAvailW;
            const area = leafW * doorH;
            const isLeft = sel === "left" || sel === "leftMirror";
            const codeSuffix = isLeft
              ? "L"
              : sel === "right" || sel === "rightMirror"
                ? "D"
                : "";
            items.push({
              code: `A${letter}V.${codeSuffix}${suffix}`,
              desc: `Vrata ${isLeft ? "leva" : codeSuffix === "D" ? "desna" : "jednokrilna"} ${letter}${suffix}`,
              widthCm: leafW * 100,
              heightCm: doorH * 100,
              thicknessMm: doorT * 1000,
              areaM2: area,
              cost: area * pricePerM2,
              element: letter,
            });
          }
        }

        // Extras center vertical divider (from Extras menu)
        {
          const extras = compartmentExtras[
            letter as keyof typeof compartmentExtras
          ] as any;
          if (extras?.verticalDivider) {
            const drawerH = 10 / 100;
            const gap = 1 / 100;
            const per = drawerH + gap;
            const raiseByBase =
              hasBase && (modulesY.length === 1 || mIdx === 0)
                ? baseHeight / 100
                : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(
              0,
              Math.floor((innerHForDrawers + gap) / per),
            );
            const countFromState = Math.max(
              0,
              Math.floor(extras?.drawersCount ?? 0),
            );
            const usedDrawerCount = extras?.drawers
              ? countFromState > 0
                ? Math.min(countFromState, maxAuto)
                : maxAuto
              : 0;
            const drawersTopY =
              usedDrawerCount > 0
                ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                : 0;
            const autoShelfExists =
              usedDrawerCount > 0 &&
              usedDrawerCount < maxAuto &&
              yEndInner - (drawersTopY + gap) >= t;
            let yDivFrom = yStartInner;
            if (usedDrawerCount > 0) {
              const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
              yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
            }
            const hDiv = Math.max(yEndInner - yDivFrom, 0);
            if (hDiv > 0) {
              const area = d * hDiv;
              items.push({
                code: `A${letter}VD.C${suffix}`,
                desc: `Vertikalni divider (srednji) ${letter}${suffix}`,
                widthCm: d * 100,
                heightCm: hDiv * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          }
        }

        // Drawers
        const extras = compartmentExtras[
          letter as keyof typeof compartmentExtras
        ] as any;
        if (extras?.drawers) {
          const drawerH = 10 / 100;
          const gap = 1 / 100;
          const per = drawerH + gap;
          const yStartInner = m.yStart + t;
          const yEndInner = m.yEnd - t;
          const raiseByBase =
            hasBase && (modulesY.length === 1 || mIdx === 0)
              ? baseHeight / 100
              : 0;
          const drawersYStart = yStartInner + raiseByBase;
          const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
          const maxAuto = Math.max(
            0,
            Math.floor((innerHForDrawers + gap) / per),
          );
          const countFromState = Math.max(
            0,
            Math.floor(extras.drawersCount ?? 0),
          );
          const used =
            countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
          for (let i = 0; i < used; i++) {
            const area = innerW * drawerH;
            items.push({
              code: `A${letter}F.${i + 1}${suffix}`,
              desc: `Fioka ${letter}${suffix}`,
              widthCm: innerW * 100,
              heightCm: drawerH * 100,
              thicknessMm: t * 1000,
              areaM2: area,
              cost: area * pricePerM2,
              element: letter,
            });
          }

          // Auto-shelf directly above drawers if they don't fill full available height
          if (used > 0 && used < maxAuto) {
            const drawersTopY = drawersYStart + drawerH + (used - 1) * per;
            const shelfPlaneY = drawersTopY + gap; // bottom plane of the shelf
            const remaining = yEndInner - shelfPlaneY;
            if (remaining >= t) {
              const area = innerW * d;
              items.push({
                code: `A${letter}P.A${suffix}`,
                desc: `Polica iznad fioka ${letter}${suffix}`,
                widthCm: innerW * 100,
                heightCm: d * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          }
        }

        // Back panel per element: use FULL element size (elemW/moduleH), minus 2mm total clearance
        {
          const clearanceBack = 2 / 1000; // 2mm
          const backW = Math.max(elemW - clearanceBack, 0);
          const backH = Math.max(moduleH - clearanceBack, 0);
          if (backW > 0 && backH > 0) {
            const area = backW * backH;
            items.push({
              code: `A${letter}Z${suffix}`,
              desc: `Zadnji panel ${letter}${suffix}`,
              widthCm: backW * 100,
              heightCm: backH * 100,
              thicknessMm: backT * 1000,
              areaM2: area,
              cost: area * backPricePerM2,
              element: letter,
            });
          }
        }

        idx += 1;
      });
    });

    const totalArea = items.reduce((a, b) => a + b.areaM2, 0);
    const totalCost = items.reduce((a, b) => a + b.cost, 0);
    const grouped = items.reduce((acc: Record<string, CutListItem[]>, it) => {
      (acc[it.element] = acc[it.element] || []).push(it);
      return acc;
    }, {});

    return { items, grouped, totalArea, totalCost, pricePerM2 };
  } catch {
    return emptyCutList;
  }
}
