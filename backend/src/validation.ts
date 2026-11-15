import { z } from "zod";
export const id = z.string().uuid();
const label = z.string().trim().min(2).max(100);
const dimension = z.number().int().min(10).max(10000);
export const registerDto = z
  .object({
    name: label,
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(10).max(128),
  })
  .strict();
export const loginDto = registerDto.omit({ name: true });
export const boatDto = z
  .object({
    name: label,
    registration: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .transform((s) => s.toUpperCase()),
    length_cm: dimension,
    width_cm: dimension,
    draft_cm: dimension,
  })
  .strict();
export const berthDto = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((s) => s.toUpperCase()),
    max_length_cm: dimension,
    max_width_cm: dimension,
    max_draft_cm: dimension,
    rate_cents: z.number().int().min(100).max(1000000),
  })
  .strict();
export const periodDto = z.object({
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
});
export const reservationDto = periodDto
  .extend({ boat_id: id, berth_id: id })
  .strict();
export const availabilityDto = periodDto.extend({ boat_id: id }).strict();
export const faultDto = z
  .object({
    berth_id: id,
    description: z.string().trim().min(10).max(2000),
    severity: z.enum(["MINOR", "CRITICAL"]),
  })
  .strict();
export const resolveFaultDto = z
  .object({
    status: z.enum(["IN_PROGRESS", "RESOLVED"]),
    resolution: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine((v) => v.status !== "RESOLVED" || v.resolution.length >= 5, {
    message: "Opisz sposób usunięcia usterki.",
  });
export const berthStatusDto = z
  .object({
    status: z.enum(["AVAILABLE", "CLOSED"]),
    reason: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine((v) => v.status !== "CLOSED" || v.reason.length >= 5, {
    message: "Podaj powód zamknięcia miejsca.",
  });
export const userDto = z
  .object({ role: z.enum(["SAILOR", "STAFF", "ADMIN"]), active: z.boolean() })
  .strict();
export const pageDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  status: z.string().max(30).default(""),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
});
export type Page = z.infer<typeof pageDto>;
