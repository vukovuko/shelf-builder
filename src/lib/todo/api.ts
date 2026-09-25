import { NextResponse } from "next/server";
import { z } from "zod";

export const NOTE_COLORS = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "gray",
] as const;

const coord = z.number().finite().min(-1_000_000).max(1_000_000);

export const noteCreateSchema = z.object({
  // The board makes the id, so a note keeps it from the first draw on.
  id: z.string().uuid().optional(),
  body: z.string().max(20_000).default(""),
  color: z.enum(NOTE_COLORS).default("yellow"),
  x: coord,
  y: coord,
  width: z.number().int().min(200).max(900).default(320),
});

export const notePatchSchema = z
  .object({
    body: z.string().max(20_000),
    color: z.enum(NOTE_COLORS),
    x: coord,
    y: coord,
    width: z.number().int().min(200).max(900),
  })
  .partial();

export const linkCreateSchema = z.object({
  id: z.string().uuid().optional(),
  sourceId: z.string().min(1).max(64),
  targetId: z.string().min(1).max(64),
});

/** requireAdmin throws these two; everything else is a server error. */
export function adminErrorResponse(error: unknown, action: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Prijavite se" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Nemate pristup" }, { status: 403 });
  }
  console.error(`To-do board: ${action} failed:`, error);
  return NextResponse.json(
    { error: "Čuvanje nije uspelo. Pokušajte ponovo." },
    { status: 500 },
  );
}
