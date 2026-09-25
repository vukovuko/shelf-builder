import { UPLOAD_MAX_EDGE_PX } from "./config";

export class UnsupportedImageError extends Error {}

async function decode(
  file: File,
): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Some browsers only decode certain formats (e.g. HEIC on Safari) via <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new UnsupportedImageError();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Shrinks a photo to fit the upload limit and re-encodes it as JPEG.
 * Phone photos are 4–8 MB; the server accepts ~4.5 MB, and a sketch reads
 * just as well at 2000 px.
 */
export async function shrinkImageForUpload(
  file: File,
): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const source = await decode(file);
  const scale = Math.min(
    1,
    UPLOAD_MAX_EDGE_PX / Math.max(source.width, source.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UnsupportedImageError();
  // Transparent PNG areas would turn black in JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    mediaType: "image/jpeg",
  };
}
