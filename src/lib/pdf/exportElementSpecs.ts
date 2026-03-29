import jsPDF from "jspdf";
import {
  useShelfStore,
  parseSubCompKey,
  type Material,
  type Handle,
} from "@/lib/store";
import {
  buildBlocksFromBoundaries,
  getCompartmentsForColumn,
} from "@/lib/blueprintHelpers";
import {
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import {
  buildCabinetShellRects,
  buildCabinetShellJointLines,
  buildDoubleSeamCenterLine,
  buildEvenShelfRects,
  buildSideViewSectionRects,
  buildSectionDividerRects,
  computeSectionBounds,
} from "@/lib/technicalDrawingModel";
import type { CutList } from "@/lib/calcCutList";
import { parseCutListElementKey as parseGroupedElementKey } from "@/lib/calcCutList";

export function exportElementSpecs(
  cutList: CutList,
  fmt2: (n: number) => string,
  materials: Material[],
  storeHandles: Handle[] = [],
  options?: { filename?: string },
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
    const depthCm = useShelfStore.getState().depth; // cm
    const hasBase = useShelfStore.getState().hasBase;
    const baseHeight = useShelfStore.getState().baseHeight; // cm
    const verticalBoundaries = useShelfStore.getState().verticalBoundaries;
    const columnHorizontalBoundaries =
      useShelfStore.getState().columnHorizontalBoundaries;
    const columnModuleBoundaries =
      useShelfStore.getState().columnModuleBoundaries;
    const columnTopModuleShelves =
      useShelfStore.getState().columnTopModuleShelves;
    const columnHeights = useShelfStore.getState().columnHeights;
    const columns = buildBlocksFromBoundaries(widthCm, verticalBoundaries);

    // Letter index helpers (A..Z..AA..)
    const fromLetters = (s: string) => {
      let n = 0;
      for (let i = 0; i < s.length; i++) {
        n = n * 26 + (s.charCodeAt(i) - 64);
      }
      return n - 1; // zero-based
    };

    const getElementDimsCm = (elementKey: string) => {
      const parsedElement = parseGroupedElementKey(elementKey);
      const baseLetter = parsedElement?.columnKey ?? elementKey;
      const idx = fromLetters(baseLetter);
      const col = columns[idx];
      return {
        wCm: col?.width ?? widthCm,
        hCm: columnHeights[idx] ?? heightCm,
        colIdx: idx,
      };
    };

    const getElementModuleLayout = (elementKey: string, tCm: number) => {
      const parsedElement = parseGroupedElementKey(elementKey);
      const baseLetter = parsedElement?.columnKey ?? elementKey;
      const isTopModule = parsedElement?.isTopModule ?? false;
      const { wCm, hCm: columnHeightCm, colIdx } = getElementDimsCm(elementKey);
      const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
      const moduleBoundaryCm =
        moduleBoundary !== null ? moduleBoundary * 100 : null;
      const innerBottom = hasBase ? baseHeight + tCm : tCm;
      const innerTop = columnHeightCm - tCm;
      const hasValidBoundary =
        moduleBoundaryCm !== null &&
        columnHeightCm > TARGET_BOTTOM_HEIGHT_CM &&
        moduleBoundaryCm > innerBottom + tCm &&
        moduleBoundaryCm < innerTop - tCm;

      const moduleStartCm =
        isTopModule && hasValidBoundary ? moduleBoundaryCm! : 0;
      const moduleEndCm =
        !isTopModule && hasValidBoundary ? moduleBoundaryCm! : columnHeightCm;
      const moduleHeightCm = Math.max(moduleEndCm - moduleStartCm, 0);

      return {
        baseLetter,
        colIdx,
        wCm,
        columnHeightCm,
        isTopModule,
        hasValidBoundary,
        moduleStartCm,
        moduleEndCm,
        moduleHeightCm,
        appliesBase: hasBase && !isTopModule,
      };
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
      const currentMaterialId = useShelfStore.getState().selectedMaterialId;
      const mat = materials.find(
        (m) => String(m.id) === String(currentMaterialId),
      );
      const tCm = Number(mat?.thickness ?? 18) / 10; // cm
      const moduleLayout = getElementModuleLayout(letter, tCm);
      const {
        colIdx,
        wCm: elementWcm,
        moduleHeightCm: elementHcm,
        moduleStartCm,
        moduleEndCm,
        appliesBase,
      } = moduleLayout;
      const allCompartmentDefs = getCompartmentsForColumn({
        colIdx,
        columnHeights,
        height: heightCm,
        columnHorizontalBoundaries,
        columnModuleBoundaries,
        columnTopModuleShelves,
        hasBase,
        baseHeight,
        tCm,
      });
      const compartmentDefs = allCompartmentDefs
        .filter(
          (comp) => comp.bottomY >= moduleStartCm && comp.topY <= moduleEndCm,
        )
        .map((comp) => ({
          ...comp,
          bottomY: comp.bottomY - moduleStartCm,
          topY: comp.topY - moduleStartCm,
        }));
      const visibleCompartmentKeys = new Set(
        compartmentDefs.map((comp) => comp.key),
      );

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

      const cmPerMmX = elementWcm / boxW; // how many cm are represented by 1mm in drawing (X)
      const cmPerMmY = elementHcm / boxH; // how many cm are represented by 1mm in drawing (Y)
      const tOffsetXmm = tCm / cmPerMmX;
      const tOffsetYmm = tCm / cmPerMmY;
      // Base region inside element (applies to lower module or single)
      const baseMm = appliesBase ? Math.max(0, baseHeight / cmPerMmY) : 0;
      const innerLeftMmX = boxX + tOffsetXmm;
      const innerRightMmX = boxX + boxW - tOffsetXmm;
      const mapY = (yFromLocalCm: number) => {
        const clamped = Math.max(0, Math.min(elementHcm, yFromLocalCm));
        return boxY + boxH - clamped / cmPerMmY;
      };

      const drawPanel = (
        x: number,
        y: number,
        widthMm: number,
        heightMm: number,
        fillGray = 245,
      ) => {
        if (widthMm <= 0 || heightMm <= 0) return;
        doc.setFillColor(fillGray, fillGray, fillGray);
        doc.rect(x, y, widthMm, heightMm, "FD");
      };

      const innerPanelSpan = Math.max(innerRightMmX - innerLeftMmX, 0);
      const sectionDimensionRows: Array<{
        compKey: string;
        sections: Array<{ x: number; width: number }>;
      }> = [];

      const shellRects = buildCabinetShellRects({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        panelThicknessX: tOffsetXmm,
        panelThicknessY: tOffsetYmm,
        baseHeight: baseMm,
        includeLeft: true,
        includeRight: true,
      });
      shellRects.forEach((rect) => {
        drawPanel(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          rect.tone === "outer" ? 242 : 245,
        );
      });
      buildCabinetShellJointLines({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        panelThicknessX: tOffsetXmm,
        panelThicknessY: tOffsetYmm,
        baseHeight: baseMm,
        includeLeft: true,
        includeRight: true,
      }).forEach((line) => {
        doc.line(line.x1, line.y1, line.x2, line.y2);
      });

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

      const mainShelves = columnHorizontalBoundaries[colIdx] || [];
      mainShelves
        .map((s) => s * 100)
        .filter((shelfY) => shelfY > moduleStartCm && shelfY < moduleEndCm)
        .forEach((shelfY) => {
          drawPanel(
            innerLeftMmX,
            mapY(shelfY - moduleStartCm + tCm / 2),
            innerRightMmX - innerLeftMmX,
            tOffsetYmm,
            250,
          );
        });

      const topShelves = columnTopModuleShelves[colIdx] || [];
      if (topShelves.length > 0) {
        topShelves
          .map((s) => s * 100)
          .filter((shelfY) => shelfY > moduleStartCm && shelfY < moduleEndCm)
          .forEach((shelfY) => {
            drawPanel(
              innerLeftMmX,
              mapY(shelfY - moduleStartCm + tCm / 2),
              innerRightMmX - innerLeftMmX,
              tOffsetYmm,
              250,
            );
          });
      }

      compartmentDefs.forEach((comp) => {
        const compCfg = (elementConfigs as any)[comp.key] ?? {
          columns: 1,
          rowCounts: [0],
        };
        const compExtras = (compartmentExtras as any)[comp.key] ?? {};
        const compInnerCols = Math.max(1, Number(compCfg.columns) || 1);
        const compInnerSpan = innerRightMmX - innerLeftMmX;
        const compSections = computeSectionBounds({
          x: innerLeftMmX,
          width: compInnerSpan,
          sectionCount: compInnerCols,
          dividerThickness: tOffsetXmm,
        });
        const safeBottomY = Math.max(0, Math.min(elementHcm, comp.bottomY));
        const safeTopY = Math.max(0, Math.min(elementHcm, comp.topY));
        if (safeTopY <= safeBottomY) return;

        if (compInnerCols > 1) {
          sectionDimensionRows.push({
            compKey: comp.key,
            sections: compSections,
          });
        }

        buildSectionDividerRects({
          x: innerLeftMmX,
          width: compInnerSpan,
          y: mapY(safeTopY),
          height: (safeTopY - safeBottomY) / cmPerMmY,
          sectionCount: compInnerCols,
          dividerThickness: tOffsetXmm,
        }).forEach((rect) => {
          drawPanel(rect.x, rect.y, rect.width, rect.height, 233);
        });

        if (compInnerCols > 1) {
          compSections.slice(1).forEach((section) => {
            const seamLine = buildDoubleSeamCenterLine({
              x: section.x - tOffsetXmm,
              y: mapY(safeTopY),
              height: (safeTopY - safeBottomY) / cmPerMmY,
            });
            if (seamLine) {
              doc.line(seamLine.x1, seamLine.y1, seamLine.x2, seamLine.y2);
            }
          });
        }

        for (let secIdx = 0; secIdx < compInnerCols; secIdx++) {
          const shelfCount = Math.max(
            0,
            Math.floor(Number(compCfg.rowCounts?.[secIdx] ?? 0)),
          );
          const section = compSections[secIdx];
          if (!section) continue;

          if (shelfCount > 0) {
            buildEvenShelfRects({
              x: section.x,
              width: section.width,
              topY: mapY(safeTopY),
              bottomY: mapY(safeBottomY),
              shelfCount,
              shelfThickness: tOffsetYmm,
            }).forEach((rect) => {
              drawPanel(rect.x, rect.y, rect.width, rect.height, 250);
            });
          }

          const drawerCount = Math.max(
            0,
            Math.floor(Number(compCfg.drawerCounts?.[secIdx] ?? 0)),
          );
          if (drawerCount > 0) {
            const drawerInset = 1;
            const drawerX = section.x + drawerInset;
            const drawerW = section.width - drawerInset * 2;
            if (drawerW > 0) {
              const compHeight = safeTopY - safeBottomY;
              if (shelfCount <= 0) {
                const drawerHeight = compHeight / drawerCount;
                for (let drIdx = 0; drIdx < drawerCount; drIdx++) {
                  const drawerBottomY = safeBottomY + drIdx * drawerHeight;
                  const drawerTopY = Math.min(
                    drawerBottomY + drawerHeight,
                    safeTopY,
                  );
                  const rectY = mapY(drawerTopY);
                  const rectH = (drawerTopY - drawerBottomY) / cmPerMmY;
                  if (rectH > 0) {
                    doc.rect(drawerX, rectY, drawerW, rectH, "S");
                  }
                }
              } else {
                const gap = compHeight / (shelfCount + 1);
                const maxDrawers = Math.min(drawerCount, shelfCount + 1);
                for (let drIdx = 0; drIdx < maxDrawers; drIdx++) {
                  const drawerBottomY = safeBottomY + drIdx * gap + tCm / 2;
                  const drawerTopY = Math.min(
                    safeBottomY + (drIdx + 1) * gap - tCm / 2,
                    safeTopY,
                  );
                  const rectY = mapY(drawerTopY);
                  const rectH = (drawerTopY - drawerBottomY) / cmPerMmY;
                  if (rectH > 0) {
                    doc.rect(drawerX, rectY, drawerW, rectH, "S");
                  }
                }
              }
            }
          }
        }

        if (compExtras.rod) {
          const rodY = mapY(Math.max(safeBottomY, safeTopY - 6));
          const inset = 2;
          doc.setLineWidth(0.4);
          doc.line(innerLeftMmX + inset, rodY, innerRightMmX - inset, rodY);
          doc.setLineWidth(0.2);
        }

        if (compExtras.led) {
          const ledY = mapY(safeTopY) + 3;
          doc.setFontSize(7.5);
          doc.text("LED", (innerLeftMmX + innerRightMmX) / 2, ledY, {
            align: "center",
            baseline: "top" as any,
          });
          doc.setFontSize(baseFont);
        }

        if (compExtras.verticalDivider) {
          const dividerX = boxX + boxW / 2 - tOffsetXmm / 2;
          drawPanel(
            dividerX,
            mapY(safeTopY),
            tOffsetXmm,
            (safeTopY - safeBottomY) / cmPerMmY,
            233,
          );
        }
      });
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
      sectionDimensionRows.forEach((row, rowIdx) => {
        const compY = dimY + 6 + rowIdx * 6;
        doc.setFontSize(7);
        doc.text(row.compKey, boxX - 2, compY + 0.8, { align: "right" as any });
        doc.setFontSize(baseFont);
        row.sections.forEach((section) => {
          drawDimH(
            section.x,
            compY,
            section.x + section.width,
            `${fmt2(section.width * cmPerMmX)} cm`,
            {
              arrows: true,
              ext: 2.5,
              font: 8,
            },
          );
        });
      });

      const dimensionRowsHeight = sectionDimensionRows.length * 6;

      const sideMaxW = 34;
      const sideScale = Math.min(
        sideMaxW / Math.max(1, depthCm),
        boxH / Math.max(1, elementHcm),
      );
      const sideW = depthCm * sideScale;
      const sideH = elementHcm * sideScale;
      const sideX = margin + 2;
      const sideY = dimY + 10 + dimensionRowsHeight;
      const sideTopBottomThickness = tCm / (elementHcm / Math.max(sideH, 1));
      const sideBackThickness = 0.5 / (elementHcm / Math.max(sideH, 1));
      const sideBaseMm = appliesBase
        ? Math.max(0, baseHeight / (elementHcm / Math.max(sideH, 1)))
        : 0;

      const sideRects = buildSideViewSectionRects({
        x: sideX,
        y: sideY,
        depth: sideW,
        height: sideH,
        topBottomThickness: sideTopBottomThickness,
        backThickness: sideBackThickness,
        baseHeight: sideBaseMm,
      });
      sideRects.forEach((rect) => {
        const toneGray =
          rect.tone === "back" ? 218 : rect.tone === "outer" ? 242 : 245;
        drawPanel(rect.x, rect.y, rect.width, rect.height, toneGray);
      });
      if (appliesBase && sideBaseMm > 0) {
        doc.setFillColor("#e6e6e6");
        doc.rect(sideX, sideY + sideH - sideBaseMm, sideW, sideBaseMm, "FD");
      }
      doc.setFontSize(8);
      doc.text("Pogled sa strane", sideX + sideW / 2, sideY - 2, {
        align: "center" as any,
      });
      doc.setFontSize(baseFont);

      const contentBottomY = Math.max(
        sideY + sideH + 10,
        boxY + boxH + 14 + dimensionRowsHeight,
      );

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
            const compKey = parsed ? parsed.compKey : c;
            return visibleCompartmentKeys.has(compKey);
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

      let y = Math.max(contentBottomY, dimY + 6 + dimensionRowsHeight);
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
    doc.save(options?.filename ?? "specifikacija-elemenata.pdf");
  } catch (e) {
    console.error("PDF export failed", e);
  }
}
