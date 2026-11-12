import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { submitPublicContact } from "./contact.server";

const publicContactSchema = z.object({
  name: z
    .string()
    .min(2, "Ime mora imati najmanje 2 karaktera")
    .max(100, "Ime je predugačko"),
  email: z.string().email("Neispravan email format").nullable().optional(),
  phone: z
    .string()
    .max(30, "Broj telefona je predugačak")
    .nullable()
    .optional(),
  message: z
    .string()
    .min(10, "Poruka mora imati najmanje 10 karaktera")
    .max(5000, "Poruka je predugačka"),
  turnstileToken: z.string().min(1, "Verifikacija je obavezna"),
});

export const sendPublicContact = createServerFn({ method: "POST" })
  .validator(publicContactSchema)
  .handler(({ data }) => submitPublicContact(data, getRequest()));
