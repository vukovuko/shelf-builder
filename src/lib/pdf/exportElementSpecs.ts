import jsPDF from "jspdf";
import {
  useShelfStore,
  parseSubCompKey,
  type Material,
  type Handle,
} from "@/lib/store";
import {
  DRAWER_HEIGHT_CM,
  DRAWER_GAP_CM,
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import type { CutList } from "@/lib/calcCutList";

export function exportElementSpecs(
  cutList: CutList,
  fmt2: (n: number) => string,
  materials: Material[],
  storeHandles: Handle[],
) {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const _pageW = 210;
    const pageH = 297;
    const margin = 12;
    const baseFont = 11;

    // Sizing helpers from store
    const widthCm = useShelfStore.getState().width; // cm
    const heightCm = useShelfStore.getState().height; // cm
    const hasBase = useShelfStore.getState().hasBase;
    const baseHeight = useShelfStore.getState().baseHeight; // cm
    const nBlocksX = Math.max(1, Math.ceil(widthCm / MAX_SEGMENT_X_CM));
    const hasSplitY = heightCm > TARGET_BOTTOM_HEIGHT_CM;
    let bottomModuleCm = Math.min(TARGET_BOTTOM_HEIGHT_CM, heightCm);
    const topModuleCm = hasSplitY
      ? Math.max(MIN_TOP_HEIGHT_CM, heightCm - TARGET_BOTTOM_HEIGHT_CM)
      : 0;
    if (hasSplitY && heightCm - TARGET_BOTTOM_HEIGHT_CM < MIN_TOP_HEIGHT_CM) {
      // Adjust bottom if top had to be enlarged
      bottomModuleCm = heightCm - topModuleCm;
    }
    const nModulesY = hasSplitY ? 2 : 1;

    // Precompute block widths in cm (match BlueprintView: equal division across blocks)
    const equalBlockW = widthCm / nBlocksX;
    const blockWidthsCm: number[] = Array.from(
      { length: nBlocksX },
      () => equalBlockW,
    );

    // Letter index helpers (A..Z..AA..)
    const fromLetters = (s: string) => {
      let n = 0;
      for (let i = 0; i < s.length; i++) {
        n = n * 26 + (s.charCodeAt(i) - 64);
      }
      return n - 1; // zero-based
    };

    const getElementDimsCm = (letter: string) => {
      const idx = fromLetters(letter);
      const rowIdx = Math.floor(idx / nBlocksX); // 0 bottom, 1 top if split
      const colIdx = idx % nBlocksX;
      const wCm = blockWidthsCm[colIdx] ?? widthCm; // fallback to total
      const hCm =
        nModulesY === 1
          ? heightCm
          : rowIdx === 0
            ? bottomModuleCm
            : topModuleCm;
      return { wCm, hCm, rowIdx, colIdx };
    };

    // Draw helpers: dimension lines
    const drawDimH = (
      x1: number,
      y: number,
      x2: number,
      label: string,
      options?: { arrows?: boolean; ext?: number; font?: number },
    ) => {
      const ext = options?.ext ?? 3;
      const font = options?.font ?? 9;
      // extension lines
      doc.line(x1, y - ext, x1, y + ext);
      doc.line(x2, y - ext, x2, y + ext);
      // main dim line
      doc.line(x1, y, x2, y);
      // arrows (simple V)
      if (options?.arrows !== false) {
        doc.line(x1, y, x1 + 1.8, y - 1.2);
        doc.line(x1, y, x1 + 1.8, y + 1.2);
        doc.line(x2, y, x2 - 1.8, y - 1.2);
        doc.line(x2, y, x2 - 1.8, y + 1.2);
      }
      // label centered
      const cx = (x1 + x2) / 2;
      doc.setFontSize(font);
      doc.text(label, cx, y - 1.5, {
        align: "center",
        baseline: "bottom" as any,
      });
      doc.setFontSize(baseFont);
    };

    const drawDimV = (
      x: number,
      y1: number,
      y2: number,
      label: string,
      options?: { arrows?: boolean; ext?: number; font?: number },
    ) => {
      const ext = options?.ext ?? 3;
      const font = options?.font ?? 9;
      // extension lines
      doc.line(x - ext, y1, x + ext, y1);
      doc.line(x - ext, y2, x + ext, y2);
      // main dim line
      doc.line(x, y1, x, y2);
      // arrows
      if (options?.arrows !== false) {
        doc.line(x, y1, x - 1.2, y1 + 1.8);
        doc.line(x, y1, x + 1.2, y1 + 1.8);
        doc.line(x, y2, x - 1.2, y2 - 1.8);
        doc.line(x, y2, x + 1.2, y2 - 1.8);
      }
      // label centered
      const cy = (y1 + y2) / 2;
      doc.setFontSize(font);
      doc.text(label, x + 2.5, cy, {
        align: "left",
        baseline: "middle" as any,
      });
      doc.setFontSize(baseFont);
    };

    const elementKeys = Object.keys(cutList.grouped);
    if (elementKeys.length === 0) {
      doc.text("Nema elemenata za specifikaciju.", margin, margin);
    }
    elementKeys.forEach((letter, idx) => {
      if (idx > 0) doc.addPage();
      doc.setFontSize(16);
      doc.text(`Specifikacija elementa ${letter}`, margin, margin + 4);
      doc.setFontSize(baseFont);
      // Schematic drawing style: thin stroke, no fill
      doc.setDrawColor(40);
      doc.setLineWidth(0.2);
      // Internal layout using elementConfigs and extras
      const elementConfigs = useShelfStore.getState().elementConfigs;
      const compartmentExtras = useShelfStore.getState().compartmentExtras;
      const cfg = (elementConfigs as any)[letter] ?? {
        columns: 1,
        rowCounts: [0],
      };
      const cols = Math.max(1, Number(cfg.columns) || 1);
      const {
        wCm: elementWcm,
        hCm: elementHcm,
        rowIdx,
      } = getElementDimsCm(letter);

      // ===============================================
      // PROPORTIONAL BOX SIZE CALCULATION
      // ===============================================
      // Max available space on PDF
      const maxBoxW = 140; // mm - max available width (leave room for dims on right)
      const maxBoxH = 65; // mm - max available height before table

      // Calculate aspect ratio of actual element
      const aspectRatio = elementWcm / elementHcm;

      // Fit to available space while preserving aspect ratio
      let boxW: number;
      let boxH: number;

      if (aspectRatio > maxBoxW / maxBoxH) {
        // Width-constrained (wide element)
        boxW = maxBoxW;
        boxH = maxBoxW / aspectRatio;
      } else {
        // Height-constrained (tall element)
        boxH = maxBoxH;
        boxW = maxBoxH * aspectRatio;
      }

      // Ensure minimum readable size
      boxW = Math.max(boxW, 35);
      boxH = Math.max(boxH, 25);

      const boxX = margin;
      const boxY = margin + 10;
      // Outer box
      doc.rect(boxX, boxY, boxW, boxH, "S");

      const cmPerMmX = elementWcm / boxW; // how many cm are represented by 1mm in drawing (X)
      const cmPerMmY = elementHcm / boxH; // how many cm are represented by 1mm in drawing (Y)
      // Material thickness in cm from selected material
      const currentMaterialId = useShelfStore.getState().selectedMaterialId;
      const mat = materials.find(
        (m) => String(m.id) === String(currentMaterialId),
      );
      const tCm = Number(mat?.thickness ?? 18) / 10; // cm
      const tOffsetXmm = tCm / cmPerMmX;
      const tOffsetYmm = tCm / cmPerMmY;
      // Base region inside element (applies to lower module or single)
      const appliesBase =
        hasBase && (heightCm <= TARGET_BOTTOM_HEIGHT_CM || rowIdx === 0);
      const baseMm = appliesBase ? Math.max(0, baseHeight / cmPerMmY) : 0;
      const innerTopMmY = boxY + tOffsetYmm;
      const innerBottomMmY = boxY + boxH - tOffsetYmm - baseMm;
      const innerLeftMmX = boxX + tOffsetXmm;
      const innerRightMmX = boxX + boxW - tOffsetXmm;
      // Draw base (hatched rectangle) if applicable
      if (appliesBase && baseMm > 0) {
        const by = boxY + boxH - baseMm;
        doc.setFillColor("#e6e6e6");
        doc.rect(innerLeftMmX, by, innerRightMmX - innerLeftMmX, baseMm, "FD");
        doc.setFillColor("#ffffff");
        // Base height label
        doc.setFontSize(8);
        doc.text(`${fmt2(baseHeight)} cm`, innerRightMmX - 6, by + baseMm / 2, {
          align: "right",
          baseline: "middle" as any,
        });
        doc.setFontSize(baseFont);
      }
      // Vertical dividers (between inner left/right), equal division per app
      for (let c = 1; c < cols; c++) {
        const x = innerLeftMmX + (c * (innerRightMmX - innerLeftMmX)) / cols;
        doc.line(x, boxY + 1, x, boxY + boxH - 1);
      }
      // Shelves per compartment (distributed evenly)
      let firstCompGapCm: number | null = null;
      for (let c = 0; c < cols; c++) {
        const count = Math.max(0, Math.floor(Number(cfg.rowCounts?.[c] ?? 0)));
        if (count <= 0) continue;
        const compX0 = boxX + (c * boxW) / cols + 1;
        const compX1 = boxX + ((c + 1) * boxW) / cols - 1;
        const innerH = Math.max(innerBottomMmY - innerTopMmY, 0);
        const gapMm = innerH / (count + 1);
        const gapCm = gapMm * cmPerMmY;
        if (firstCompGapCm == null) firstCompGapCm = gapCm;
        for (let s = 1; s <= count; s++) {
          const y = innerTopMmY + s * gapMm;
          doc.line(compX0, y, compX1, y);
        }
        // Draw a combined vertical dimension for these gaps on the left side
        const dimXLeft = boxX - 6;
        drawDimV(
          dimXLeft,
          innerTopMmY,
          innerTopMmY + gapMm,
          `${fmt2(gapCm)} cm × ${count + 1}`,
          { arrows: true, ext: 2.5, font: 8 },
        );
      }
      // Drawers region (occupies full width; count from extras) – match BlueprintView logic
      const extras = (compartmentExtras as any)[letter] ?? {};
      if (extras.drawers) {
        const drawerHcm = DRAWER_HEIGHT_CM;
        const gapCm = DRAWER_GAP_CM;
        const drawerHMm = drawerHcm / cmPerMmY;
        const gapMm = gapCm / cmPerMmY;
        const innerHMm = Math.max(innerBottomMmY - innerTopMmY, 0);
        const maxAuto = Math.max(
          0,
          Math.floor((innerHMm + gapMm) / (drawerHMm + gapMm)),
        );
        const countFromState = Math.max(
          0,
          Math.floor(Number(extras.drawersCount ?? 0)),
        );
        const used =
          countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
        let lastTopOffsetMm = 0;
        for (let d = 0; d < used; d++) {
          const bottomOffsetMm = d * (drawerHMm + gapMm);
          const topOffsetMm = Math.min(
            bottomOffsetMm + drawerHMm,
            innerHMm - gapMm,
          );
          lastTopOffsetMm = topOffsetMm;
          const yTop = innerBottomMmY - topOffsetMm;
          const yBottom = innerBottomMmY - bottomOffsetMm;
          const hMm = Math.max(0, yBottom - yTop);
          // Ensure within inner bounds
          if (yTop < innerTopMmY) break;
          doc.rect(
            innerLeftMmX + 1,
            yTop,
            innerRightMmX - innerLeftMmX - 2,
            hMm,
            "S",
          );
          // Drawer height label
          const hCm = hMm * cmPerMmY;
          doc.setFontSize(8);
          doc.text(`${fmt2(hCm)} cm`, boxX + boxW / 2, yTop + hMm / 2, {
            align: "center",
            baseline: "middle" as any,
          });
          doc.setFontSize(baseFont);
        }
        // Auto shelf directly above drawers if space remains
        if (used > 0 && used < maxAuto) {
          const shelfOffsetMm = lastTopOffsetMm + gapMm + tCm / cmPerMmY;
          if (shelfOffsetMm < innerHMm) {
            const shelfY = innerBottomMmY - shelfOffsetMm;
            doc.line(innerLeftMmX, shelfY, innerRightMmX, shelfY);
          }
        }
      }
      // Rod indicator
      if (extras.rod) {
        const yRod = innerTopMmY + 6 / cmPerMmY; // 6cm from top
        const inset = 2; // mm from inner sides
        doc.setLineWidth(0.4);
        doc.line(innerLeftMmX + inset, yRod, innerRightMmX - inset, yRod);
        doc.setLineWidth(0.2);
      }
      // LED label
      if (extras.led) {
        const yLabel = innerTopMmY + 3;
        doc.setFontSize(7.5);
        doc.text("LED", (innerLeftMmX + innerRightMmX) / 2, yLabel, {
          align: "center",
          baseline: "top" as any,
        });
        doc.setFontSize(baseFont);
      }
      // Optional central divider
      if (extras.verticalDivider) {
        const x = boxX + boxW / 2;
        // Emulate dashed line by drawing short segments
        const dashLen = 2;
        const gapLen = 2;
        let yy = boxY + 1;
        while (yy < boxY + boxH - 1) {
          const y2 = Math.min(yy + dashLen, boxY + boxH - 1);
          doc.line(x, yy, x, y2);
          yy = y2 + gapLen;
        }
      }
      // Dimension lines and labels (outer)
      const dimY = boxY + boxH + 6;
      drawDimH(boxX, dimY, boxX + boxW, `${fmt2(elementWcm)} cm`, {
        arrows: true,
        ext: 3,
        font: 9,
      });
      const dimX = boxX + boxW + 8;
      drawDimV(dimX, boxY, boxY + boxH, `${fmt2(elementHcm)} cm`, {
        arrows: true,
        ext: 3,
        font: 9,
      });
      // Per-compartment width dimensions (evenly divided)
      if (cols > 1) {
        const compY = dimY + 6;
        for (let c = 0; c < cols; c++) {
          const x0 = boxX + (c * boxW) / cols;
          const x1 = boxX + ((c + 1) * boxW) / cols;
          drawDimH(x0, compY, x1, `${fmt2(elementWcm / cols)} cm`, {
            arrows: true,
            ext: 2.5,
            font: 8,
          });
        }
      }

      // ===============================================
      // DOOR TYPE LABEL & HANDLE INFORMATION
      // ===============================================
      const doorGroups = useShelfStore.getState().doorGroups;
      const globalHandleId =
        useShelfStore.getState().globalHandleId || "handle_1";
      const globalHandleFinish =
        useShelfStore.getState().globalHandleFinish || "chrome";
      const doorSettingsMode =
        useShelfStore.getState().doorSettingsMode || "global";

      // Find door group for this element
      const elementDoorGroup = doorGroups.find(
        (g: { compartments: string[] }) =>
          g.compartments.some((c: string) => {
            const parsed = parseSubCompKey(c);
            return (parsed ? parsed.compKey : c).startsWith(letter);
          }),
      );

      // Track Y position for door/handle info (to the right of the schematic)
      const infoStartX = boxX + boxW + 20; // Right of schematic + dimension line space
      let infoY = boxY + 3;

      // Door type label
      if (elementDoorGroup && (elementDoorGroup as any).type !== "none") {
        const doorTypeLabels: Record<string, string> = {
          left: "Leva vrata",
          right: "Desna vrata",
          double: "Dvokrilna vrata",
          leftMirror: "Leva vrata (ogledalo)",
          rightMirror: "Desna vrata (ogledalo)",
          doubleMirror: "Dvokrilna vrata (ogledalo)",
          drawerStyle: "Vrata fioka stil",
        };
        const doorLabel =
          doorTypeLabels[(elementDoorGroup as any).type] ||
          (elementDoorGroup as any).type;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Vrata:", infoStartX, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(doorLabel, infoStartX + 16, infoY);
        infoY += 6;

        // Handle info
        const handleId =
          doorSettingsMode === "per-door" && (elementDoorGroup as any).handleId
            ? (elementDoorGroup as any).handleId
            : globalHandleId;
        const handleFinish =
          doorSettingsMode === "per-door" &&
          (elementDoorGroup as any).handleFinish
            ? (elementDoorGroup as any).handleFinish
            : globalHandleFinish;

        const handleData = storeHandles.find(
          (h) => h.legacyId === handleId || String(h.id) === handleId,
        );
        const finishData = handleData?.finishes?.find(
          (f) => f.legacyId === handleFinish || String(f.id) === handleFinish,
        );

        if (handleData && finishData) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Rucka:", infoStartX, infoY);
          doc.setFont("helvetica", "normal");
          doc.text(`${handleData.name}`, infoStartX + 16, infoY);
          infoY += 5;

          doc.setFont("helvetica", "bold");
          doc.text("Zavrsna:", infoStartX, infoY);
          doc.setFont("helvetica", "normal");
          doc.text(`${finishData.name}`, infoStartX + 18, infoY);
          infoY += 5;

          // Handle count and price
          const doorType = (elementDoorGroup as any).type;
          const handleCount =
            doorType === "double" || doorType === "doubleMirror" ? 2 : 1;
          const totalHandlePrice = finishData.price * handleCount;

          doc.setFont("helvetica", "bold");
          doc.text("Cena:", infoStartX, infoY);
          doc.setFont("helvetica", "normal");
          const priceText =
            handleCount > 1
              ? `${handleCount}x ${finishData.price.toLocaleString("sr-RS")} = ${totalHandlePrice.toLocaleString("sr-RS")} RSD`
              : `${totalHandlePrice.toLocaleString("sr-RS")} RSD`;
          doc.text(priceText, infoStartX + 13, infoY);
        }
      }

      const rows = cutList.grouped[letter];
      // Table headers
      const headers = [
        "Oznaka",
        "Opis",
        "Sirina",
        "Visina",
        "Debljina",
        "m2",
        "Cena",
      ];
      // Improved column layout - more space for Opis, tighter numeric columns
      const colX = [margin, 35, 95, 120, 143, 164, 182];
      const colW = [
        colX[1] - colX[0], // 23 - Oznaka
        colX[2] - colX[1], // 60 - Opis (wider for door descriptions)
        colX[3] - colX[2], // 25 - Sirina
        colX[4] - colX[3], // 23 - Visina
        colX[5] - colX[4], // 21 - Debljina
        colX[6] - colX[5], // 18 - m2
        210 - margin - colX[6], // ~16 - Cena
      ];
      // Numeric column indices (right-align these)
      const numericCols = [2, 3, 4, 5, 6];

      let y = Math.max(boxY + boxH + 14, dimY + (cols > 1 ? 10 : 6));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      headers.forEach((h, i) => {
        const isNumeric = numericCols.includes(i);
        const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
        const align = isNumeric ? "right" : "left";
        doc.text(h, xPos, y, { align: align as any });
        doc.rect(colX[i], y - 5, colW[i], 7, "S");
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y += 8;
      rows.forEach((it: any) => {
        const line = [
          it.code ?? "",
          String(it.desc ?? ""),
          fmt2(it.widthCm ?? 0),
          fmt2(it.heightCm ?? 0),
          fmt2(it.thicknessMm ?? 0),
          fmt2(it.areaM2 ?? 0),
          fmt2(it.cost ?? 0),
        ];
        // Wrap description if too long
        const descLines = doc.splitTextToSize(line[1], colW[1] - 4);
        const rowH = Math.max(7, (descLines.length || 1) * 4 + 3);

        // Draw cells and content with proper alignment
        for (let i = 0; i < 7; i++) {
          doc.rect(colX[i], y - 5, colW[i], rowH, "S");
          const isNumeric = numericCols.includes(i);
          const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
          const align = isNumeric ? "right" : "left";
          if (i === 1) {
            // Description column - uses wrapped text
            doc.text(descLines, colX[1] + 2, y);
          } else {
            doc.text(line[i], xPos, y, { align: align as any });
          }
        }
        y += rowH + 2;
        // Page break if near bottom
        if (y > pageH - margin - 10) {
          doc.addPage();
          y = margin + 10;
        }
      });
      // Footer totals for the element
      const elementArea = rows.reduce(
        (a: number, b: any) => a + (b.areaM2 ?? 0),
        0,
      );
      const elementCost = rows.reduce(
        (a: number, b: any) => a + (b.cost ?? 0),
        0,
      );

      // Calculate handle cost for this element
      let elementHandleCost = 0;
      if (elementDoorGroup && (elementDoorGroup as any).type !== "none") {
        const handleId =
          doorSettingsMode === "per-door" && (elementDoorGroup as any).handleId
            ? (elementDoorGroup as any).handleId
            : globalHandleId;
        const handleFinish =
          doorSettingsMode === "per-door" &&
          (elementDoorGroup as any).handleFinish
            ? (elementDoorGroup as any).handleFinish
            : globalHandleFinish;

        const handleData = storeHandles.find(
          (h) => h.legacyId === handleId || String(h.id) === handleId,
        );
        const finishData = handleData?.finishes?.find(
          (f) => f.legacyId === handleFinish || String(f.id) === handleFinish,
        );

        if (finishData) {
          const doorType = (elementDoorGroup as any).type;
          const handleCount =
            doorType === "double" || doorType === "doubleMirror" ? 2 : 1;
          elementHandleCost = finishData.price * handleCount;
        }
      }

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`Ukupna kvadratura: ${fmt2(elementArea)} m2`, margin, y);
      doc.text(`Cena materijala: ${fmt2(elementCost)}`, margin + 70, y);
      if (elementHandleCost > 0) {
        doc.text(
          `Rucke: ${elementHandleCost.toLocaleString("sr-RS")} RSD`,
          margin + 135,
          y,
        );
      }
      doc.setFont("helvetica", "normal");
    });
    doc.save("specifikacija-elemenata.pdf");
  } catch (e) {
    console.error("PDF export failed", e);
  }
}
