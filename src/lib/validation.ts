import { z } from "zod";
import { snapshotBoundsError } from "./snapshot-bounds";

// Thumbnails are ≤800 px JPEG screenshots (~50–100 KB); the largest ever
// stored is ~300 KB. 450 KB keeps headroom without letting one save bloat
// the database.
const MAX_THUMBNAIL_SIZE = 600_000; // base64 characters ≈ 450 KB
const THUMBNAIL_DATA_URL = /^data:image\/(jpeg|png|webp);base64,/;

export const thumbnailSchema = z
  .string()
  .nullable()
  .refine(
    (val) => !val || val.length < MAX_THUMBNAIL_SIZE,
    "Slika je prevelika",
  )
  .refine(
    (val) => !val || THUMBNAIL_DATA_URL.test(val),
    "Slika mora biti JPG, PNG ili WebP",
  );

// Wardrobe data: Max 500KB JSON
const MAX_DATA_SIZE = 500_000; // characters

export const createWardrobeSchema = z.object({
  name: z
    .string()
    .min(1, "Ime ne može biti prazno")
    .max(100, "Ime mora biti kraće od 100 karaktera")
    .trim(),

  data: z
    .record(z.string(), z.unknown())
    .refine(
      (data) => JSON.stringify(data).length < MAX_DATA_SIZE,
      "Podaci su preveliki (max 500KB)",
    )
    .refine(
      (data) => snapshotBoundsError(data) === null,
      "Nevažeći podaci ormana",
    ),

  thumbnail: thumbnailSchema.optional(),

  isModel: z.boolean().optional().default(false),
});

export const updateWardrobeSchema = z.object({
  name: z
    .string()
    .min(1, "Ime ne može biti prazno")
    .max(100, "Ime mora biti kraće od 100 karaktera")
    .trim()
    .optional(),

  data: z
    .record(z.string(), z.unknown())
    .refine(
      (data) => JSON.stringify(data).length < MAX_DATA_SIZE,
      "Podaci su preveliki (max 500KB)",
    )
    .refine(
      (data) => snapshotBoundsError(data) === null,
      "Nevažeći podaci ormana",
    )
    .optional(),

  thumbnail: thumbnailSchema.optional(),
});

export const wardrobeIdSchema = z.uuid({ message: "Nevažeći ID ormana" });

export const userIdSchema = z.string().min(1, "Nevažeći ID korisnika");

export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Ime ne može biti prazno")
    .max(100, "Ime mora biti kraće od 100 karaktera")
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(/^(\+?[1-9]\d{6,14})?$/, "Nevažeći format telefona")
    .nullable()
    .optional(),
});
