import jsPDF from "jspdf";
import type { CutList } from "@/lib/calcCutList";

export function exportCutListPDF(
  cutList: CutList,
  fmt2: (n: number) => string,
) {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageH = 297;
    const margin = 12;

    // Title
    doc.setFontSize(16);
    doc.text("Tabela ploča", margin, margin + 4);

    // Price per m²
    doc.setFontSize(10);
    doc.text(
      `Cena materijala: ${fmt2(cutList.pricePerM2)} RSD/m2`,
      margin,
      margin + 12,
    );

    let y = margin + 20;
    const elementKeys = Object.keys(cutList.grouped).sort();

    elementKeys.forEach((letter, idx) => {
      // Check if we need a new page before starting element
      if (idx > 0 && y > pageH - 60) {
        doc.addPage();
        y = margin;
      }

      // Element header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Element ${letter}`, margin, y);
      y += 6;

      // Table headers
      const headers = [
        "Oznaka",
        "Opis",
        "S (cm)",
        "V (cm)",
        "Deb",
        "m2",
        "Cena",
      ];
      const colX = [margin, 30, 80, 105, 130, 150, 170];

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => {
        doc.text(h, colX[i], y);
      });
      y += 5;

      // Underline headers
      doc.setLineWidth(0.1);
      doc.line(margin, y - 3, 210 - margin, y - 3);

      // Table rows
      doc.setFont("helvetica", "normal");
      const rows = cutList.grouped[letter];
      rows.forEach((it: any) => {
        if (y > pageH - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(it.code || "", colX[0], y);
        const desc = doc.splitTextToSize(it.desc || "", 45);
        doc.text(desc[0] || "", colX[1], y);
        doc.text(fmt2(it.widthCm), colX[2], y);
        doc.text(fmt2(it.heightCm), colX[3], y);
        doc.text(fmt2(it.thicknessMm), colX[4], y);
        doc.text(fmt2(it.areaM2), colX[5], y);
        doc.text(fmt2(it.cost), colX[6], y);
        y += 5;
      });

      // Element totals
      const elemArea = rows.reduce(
        (a: number, b: any) => a + (b.areaM2 || 0),
        0,
      );
      const elemCost = rows.reduce((a: number, b: any) => a + (b.cost || 0), 0);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.text(
        `Ukupno: ${fmt2(elemArea)} m2 | ${fmt2(elemCost)} RSD`,
        margin,
        y,
      );
      y += 10;
    });

    // Grand totals
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`UKUPNA KVADRATURA: ${fmt2(cutList.totalArea)} m2`, margin, y);
    doc.text(`UKUPNA CENA: ${fmt2(cutList.totalCost)} RSD`, margin, y + 7);

    doc.save("tabela-ploca.pdf");
  } catch (e) {
    console.error("PDF export failed", e);
  }
}
