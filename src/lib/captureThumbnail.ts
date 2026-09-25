// Thumbnails are only ever shown small; capping the width keeps each saved
// design around 50–100 KB whatever the screen resolution.
const MAX_THUMBNAIL_WIDTH = 800;

/**
 * Captures the current canvas as a thumbnail image (JPEG base64 data URL)
 * @param canvasElement The canvas element to capture
 * @returns Promise that resolves to base64 data URL
 */
export async function captureThumbnail(
  canvasElement: HTMLCanvasElement,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Wait for next frame to ensure canvas is fully rendered
    requestAnimationFrame(() => {
      try {
        // Check if canvas is valid
        if (!canvasElement || !canvasElement.getContext) {
          throw new Error("Invalid canvas element");
        }

        // Check if canvas has been drawn to
        const context =
          canvasElement.getContext("webgl2") ||
          canvasElement.getContext("webgl");
        if (!context) {
          throw new Error("WebGL context not available");
        }

        // Add a small delay to ensure WebGL has finished rendering
        setTimeout(() => {
          try {
            const scale = Math.min(
              1,
              MAX_THUMBNAIL_WIDTH / canvasElement.width,
            );
            if (scale === 1) {
              resolve(canvasElement.toDataURL("image/jpeg", 0.7));
              return;
            }
            const out = document.createElement("canvas");
            out.width = Math.round(canvasElement.width * scale);
            out.height = Math.round(canvasElement.height * scale);
            const ctx2d = out.getContext("2d");
            if (!ctx2d) throw new Error("2D context not available");
            ctx2d.drawImage(canvasElement, 0, 0, out.width, out.height);
            resolve(out.toDataURL("image/jpeg", 0.75));
          } catch (err) {
            console.error("[captureThumbnail] toDataURL failed:", err);
            reject(err);
          }
        }, 100); // 100ms delay to ensure render completes
      } catch (err) {
        console.error("[captureThumbnail] Setup failed:", err);
        reject(err);
      }
    });
  });
}
