import { describe, expect, it } from "vitest";
import { useShelfStore } from "@/lib/store";
import { importWardrobeDraft } from "../apply";
import { checkUploadedImage } from "../image";
import { draftOutputSchema } from "../prompt";

const b64 = (bytes: number[], padTo = 64) =>
  Buffer.from([
    ...bytes,
    ...Array(Math.max(0, padTo - bytes.length)).fill(0),
  ]).toString("base64");

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

describe("checkUploadedImage", () => {
  it.each([
    [JPEG, "image/jpeg"],
    [PNG, "image/png"],
    [WEBP, "image/webp"],
  ])("accepts a real %s header", (bytes, type) => {
    expect(checkUploadedImage(b64(bytes), type).ok).toBe(true);
  });

  it("rejects a file whose bytes don't match the declared type", () => {
    expect(checkUploadedImage(b64(PNG), "image/jpeg").ok).toBe(false);
  });

  it("rejects HTML pretending to be an image", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>").toString(
      "base64",
    );
    expect(checkUploadedImage(html, "image/png").ok).toBe(false);
  });

  it("rejects unsupported types and missing data", () => {
    expect(checkUploadedImage(b64(JPEG), "image/gif").ok).toBe(false);
    expect(checkUploadedImage(undefined, "image/jpeg").ok).toBe(false);
  });

  it("rejects anything over the size limit before decoding", () => {
    expect(checkUploadedImage("A".repeat(6_000_000), "image/jpeg").ok).toBe(
      false,
    );
  });
});

describe("Claude's structured answer → wardrobe", () => {
  it("a schema-valid answer builds a valid wardrobe", () => {
    const answer = draftOutputSchema.parse({
      recognized: true,
      widthCm: null,
      heightCm: null,
      depthCm: null,
      aspectRatio: 1,
      base: false,
      slidingDoors: false,
      sections: [
        {
          widthRatio: 1,
          shelves: [0.5],
          drawers: 0,
          rod: false,
          rodHeight: null,
          door: "none",
        },
        {
          widthRatio: 1,
          shelves: [0.5],
          drawers: 0,
          rod: false,
          rodHeight: null,
          door: "double",
        },
      ],
    });
    useShelfStore.getState().resetToDefaults();
    const result = importWardrobeDraft(answer);
    expect(result.status).toBe("ok");
    expect(result.violations).toEqual([]);
    expect(useShelfStore.getState().doorGroups.length).toBeGreaterThan(0);
  });

  it("a 'not recognized' answer leaves the design alone", () => {
    useShelfStore.getState().setWidth(300);
    const result = importWardrobeDraft({ recognized: false, sections: [] });
    expect(result.status).toBe("empty");
    expect(useShelfStore.getState().width).toBe(300);
  });
});
