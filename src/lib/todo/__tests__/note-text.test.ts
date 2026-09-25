import { describe, expect, it } from "vitest";
import {
  linkify,
  noteProgress,
  noteTitle,
  parseNote,
  toggleCheck,
} from "../note-text";

const note = `# Izrada aplikacije
- [x] Popravka imena
- [ ] Logo
  - [ ] nova verzija
- bilbord
obična linija`;

describe("parseNote", () => {
  it("reads headings, checkboxes with nesting, bullets and text", () => {
    const lines = parseNote(note);
    expect(lines[0]).toEqual({
      kind: "heading",
      text: "Izrada aplikacije",
      depth: 1,
    });
    expect(lines[1]).toMatchObject({ kind: "check", done: true, depth: 0 });
    expect(lines[3]).toMatchObject({
      kind: "check",
      done: false,
      depth: 1,
      text: "nova verzija",
    });
    expect(lines[4]).toMatchObject({ kind: "bullet", text: "bilbord" });
    expect(lines[5]).toMatchObject({ kind: "text", text: "obična linija" });
  });
});

describe("toggleCheck", () => {
  it("flips only the clicked line", () => {
    const once = toggleCheck(note, 2);
    expect(once.split("\n")[2]).toBe("- [x] Logo");
    expect(toggleCheck(once, 2)).toBe(note);
  });

  it("ignores lines that aren't checkboxes", () => {
    expect(toggleCheck(note, 0)).toBe(note);
    expect(toggleCheck(note, 99)).toBe(note);
  });
});

describe("noteTitle and noteProgress", () => {
  it("uses the heading and counts checkboxes", () => {
    expect(noteTitle(note)).toBe("Izrada aplikacije");
    expect(noteProgress(note)).toEqual({ done: 1, total: 3 });
    expect(noteTitle("\n\nprva linija")).toBe("prva linija");
  });
});

describe("linkify", () => {
  it("makes Serbian phone numbers and emails tappable", () => {
    const segs = linkify("Telefon: 011 3190 974, mob 063 551 694");
    expect(segs.filter((s) => s.kind === "phone").map((s) => s.href)).toEqual([
      "tel:+381113190974",
      "tel:+38163551694",
    ]);
    const email = linkify("Email: liste.tosinbunar@agacija.com");
    expect(email[1]).toEqual({
      kind: "email",
      text: "liste.tosinbunar@agacija.com",
      href: "mailto:liste.tosinbunar@agacija.com",
    });
  });

  it("keeps plain text around the links", () => {
    expect(
      linkify("Kontakt: Milan, 063 551 694 (posle 9h)").map((s) => s.text),
    ).toEqual(["Kontakt: Milan, ", "063 551 694", " (posle 9h)"]);
  });

  it("leaves text without links as one segment", () => {
    expect(linkify("snimanje u salonu")).toEqual([
      { kind: "text", text: "snimanje u salonu" },
    ]);
  });
});
