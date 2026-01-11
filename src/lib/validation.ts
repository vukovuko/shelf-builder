import { z } from "zod";

// Thumbnail: Max 5MB as base64 string
// Base64 encoding adds ~33% overhead, so 5MB image = ~6.65MB string
const MAX_THUMBNAIL_SIZE = 6_650_000; // characters

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
    ),

  thumbnail: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.length < MAX_THUMBNAIL_SIZE,
      "Slika je prevelika (max 5MB)",
    )
    .refine(
      (val) => !val || val.startsWith("data:image/"),
      "Slika mora biti data URL",
    ),
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
    .optional(),

  thumbnail: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || val.length < MAX_THUMBNAIL_SIZE,
      "Slika je prevelika (max 5MB)",
    )
    .refine(
      (val) => !val || val.startsWith("data:image/"),
      "Slika mora biti data URL",
    ),
});

export const wardrobeIdSchema = z.uuid({ message: "Nevažeći ID ormana" });

export const userIdSchema = z.uuid({ message: "Nevažeći ID korisnika" });

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
