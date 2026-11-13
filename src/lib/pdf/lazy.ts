import { toast } from "sonner";
import type { exportCutListPDF as ExportCutListPDF } from "./exportCutListPDF";
import type { exportElementSpecs as ExportElementSpecs } from "./exportElementSpecs";

// jsPDF with its helpers is about 130 KB gzipped and is needed only when
// someone exports a PDF, so it is fetched on that click instead of with the
// configurator.

// The files of an older build are gone after a deploy, so a page left open
// across one cannot fetch them any more.
const failed = () =>
  toast.error("Izvoz nije uspeo. Osvežite stranicu i pokušajte ponovo.");

export async function exportElementSpecs(
  ...args: Parameters<typeof ExportElementSpecs>
) {
  try {
    const pdf = await import("./exportElementSpecs");
    pdf.exportElementSpecs(...args);
  } catch (error) {
    console.error("PDF export failed:", error);
    failed();
  }
}

export async function exportCutListPDF(
  ...args: Parameters<typeof ExportCutListPDF>
) {
  try {
    const pdf = await import("./exportCutListPDF");
    pdf.exportCutListPDF(...args);
  } catch (error) {
    console.error("PDF export failed:", error);
    failed();
  }
}
