import { UPLOAD_MAX_BYTES } from "./config";

export type UploadMediaType = "image/jpeg" | "image/png" | "image/webp";

// The declared type is whatever the client says; the first bytes are what
// the file actually is.
const SIGNATURES: Record<UploadMediaType, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (v, i) => b[i] === v,
    ),
  "image/webp": (b) =>
    String.fromCharCode(...b.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.subarray(8, 12)) === "WEBP",
};

export type CheckedImage =
  | { ok: true; data: string; mediaType: UploadMediaType }
  | { ok: false; error: string };

/** Validates an uploaded base64 image before any paid call sees it. */
export function checkUploadedImage(
  data: unknown,
  mediaType: unknown,
): CheckedImage {
  if (typeof data !== "string" || typeof mediaType !== "string") {
    return { ok: false, error: "Slika nedostaje" };
  }
  if (!(mediaType in SIGNATURES)) {
    return { ok: false, error: "Dozvoljeni formati su JPG, PNG i WebP" };
  }
  // Base64 is 4 characters per 3 bytes; reject before decoding anything big.
  if (data.length > Math.ceil((UPLOAD_MAX_BYTES * 4) / 3)) {
    return { ok: false, error: "Slika je prevelika" };
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length < 12 || bytes.length > UPLOAD_MAX_BYTES) {
    return { ok: false, error: "Slika je prevelika ili oštećena" };
  }
  const type = mediaType as UploadMediaType;
  if (!SIGNATURES[type](bytes)) {
    return { ok: false, error: "Fajl nije ispravna slika" };
  }
  return { ok: true, data, mediaType: type };
}
