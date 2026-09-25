/**
 * The to-do board's note format, a small slice of markdown that reads like
 * Apple Notes: "# " heading, "- [ ] " / "- [x] " checkbox, "- " bullet,
 * anything else a plain line. Indenting by two spaces nests a line.
 */

export type NoteLine =
  | { kind: "heading"; text: string; depth: number }
  | { kind: "check"; text: string; done: boolean; depth: number; index: number }
  | { kind: "bullet"; text: string; depth: number }
  | { kind: "text"; text: string; depth: number }
  | { kind: "blank" };

const CHECK = /^(\s*)[-*] \[( |x|X)\] ?(.*)$/;
const BULLET = /^(\s*)[-*] (.*)$/;
const HEADING = /^(#{1,3}) (.*)$/;

export function parseNote(body: string): NoteLine[] {
  return body.split("\n").map((line, index) => {
    if (!line.trim()) return { kind: "blank" };
    const heading = line.match(HEADING);
    if (heading)
      return { kind: "heading", text: heading[2], depth: heading[1].length };
    const check = line.match(CHECK);
    if (check)
      return {
        kind: "check",
        text: check[3],
        done: check[2] !== " ",
        depth: Math.floor(check[1].length / 2),
        index,
      };
    const bullet = line.match(BULLET);
    if (bullet)
      return {
        kind: "bullet",
        text: bullet[2],
        depth: Math.floor(bullet[1].length / 2),
      };
    const indent = line.length - line.trimStart().length;
    return {
      kind: "text",
      text: line.trim(),
      depth: Math.floor(indent / 2),
    };
  });
}

/** Flips the checkbox on one line, leaving every other character alone. */
export function toggleCheck(body: string, lineIndex: number): string {
  const lines = body.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return body;
  const match = line.match(CHECK);
  if (!match) return body;
  const done = match[2] !== " ";
  lines[lineIndex] = line.replace(/\[( |x|X)\]/, done ? "[ ]" : "[x]");
  return lines.join("\n");
}

/** The first heading, or else the first non-empty line, as the note title. */
export function noteTitle(body: string): string {
  const lines = parseNote(body);
  const heading = lines.find((l) => l.kind === "heading");
  if (heading && "text" in heading) return heading.text;
  const first = lines.find((l) => l.kind !== "blank");
  return first && "text" in first ? first.text : "";
}

export function noteProgress(body: string): { done: number; total: number } {
  const checks = parseNote(body).filter((l) => l.kind === "check");
  return {
    done: checks.filter((l) => l.kind === "check" && l.done).length,
    total: checks.length,
  };
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "phone"; text: string; href: string }
  | { kind: "email"; text: string; href: string }
  | { kind: "url"; text: string; href: string };

// Serbian numbers as people write them: "011 3190 974", "063 551 694",
// "+381 64 829 4608", "021/474-0456".
const PHONE = /(?:\+381[\s/-]?|\b0)\d{1,3}(?:[\s/-]?\d{2,4}){2,3}\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>]+/g;

/** Splits a line into plain text and tappable phone numbers, emails, links. */
export function linkify(text: string): Segment[] {
  const found: { start: number; end: number; seg: Segment }[] = [];
  for (const m of text.matchAll(URL_RE)) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      seg: { kind: "url", text: m[0], href: m[0] },
    });
  }
  for (const m of text.matchAll(EMAIL)) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      seg: { kind: "email", text: m[0], href: `mailto:${m[0]}` },
    });
  }
  for (const m of text.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, "");
    const international = digits.startsWith("381")
      ? `+${digits}`
      : `+381${digits.slice(1)}`;
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      seg: { kind: "phone", text: m[0], href: `tel:${international}` },
    });
  }
  // Earlier and longer matches win where two overlap (a URL holding digits).
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const segments: Segment[] = [];
  let pos = 0;
  for (const f of found) {
    if (f.start < pos) continue;
    if (f.start > pos)
      segments.push({ kind: "text", text: text.slice(pos, f.start) });
    segments.push(f.seg);
    pos = f.end;
  }
  if (pos < text.length) segments.push({ kind: "text", text: text.slice(pos) });
  return segments;
}
