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
        const context = canvasElement.getContext("webgl2") || canvasElement.getContext("webgl");
        if (!context) {
          throw new Error("WebGL context not available");
        }

        // Add a small delay to ensure WebGL has finished rendering
        setTimeout(() => {
          try {
            // Capture canvas as JPEG with 70% quality (good balance of size/quality)
            const dataUrl = canvasElement.toDataURL("image/jpeg", 0.7);
            resolve(dataUrl);
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
