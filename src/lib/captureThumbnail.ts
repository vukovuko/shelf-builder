/**
 * Captures the current canvas as a thumbnail image (JPEG base64 data URL)
 * @param canvasElement The canvas element to capture
 * @returns Promise that resolves to base64 data URL
 */
export async function captureThumbnail(canvasElement: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    // Wait for next frame to ensure canvas is fully rendered
    requestAnimationFrame(() => {
      // Capture canvas as JPEG with 70% quality (good balance of size/quality)
      const dataUrl = canvasElement.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl);
    });
  });
}
