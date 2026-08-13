import { z } from "zod";

export const materialFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum([
    "duplex_greyback",
    "duplex_whiteback",
    "c1s",
    "c2s",
    "sbs",
    "kraft",
    "corrugated_e",
  ]),
  gsm: z.coerce.number().int().positive(),
  sheetWidthIn: z.coerce.number().positive(),
  sheetLengthIn: z.coerce.number().positive(),
  costPerSheetPesos: z.coerce.number().positive("Cost must be greater than zero"),
  supplier: z.string().max(200).optional().or(z.literal("")),
  isFoodGrade: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  minOrderSheets: z.coerce.number().int().nonnegative().default(0),
});
export type MaterialFormValues = z.infer<typeof materialFormSchema>;

export const processRateFormSchema = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, numbers, and underscores only"),
  label: z.string().min(1, "Label is required").max(200),
  unit: z.enum(["per_sheet", "per_piece", "per_plate", "per_job", "per_sqin"]),
  ratePesos: z.coerce.number().nonnegative(),
  setupFeePesos: z.coerce.number().nonnegative().default(0),
  setupSheets: z.coerce.number().int().nonnegative().default(0),
  isActive: z.coerce.boolean().default(true),
});
export type ProcessRateFormValues = z.infer<typeof processRateFormSchema>;

export const boxSpecFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  style: z.enum([
    "straight_tuck",
    "reverse_tuck",
    "auto_lock_bottom",
    "snap_lock",
    "mailer",
    "pizza",
    "sleeve",
    "tray_lid",
    "custom",
  ]),
  lengthMm: z.coerce.number().positive(),
  widthMm: z.coerce.number().positive(),
  heightMm: z.coerce.number().positive(),
  materialId: z.string().uuid("Select a material"),
  printColoursFront: z.coerce.number().int().nonnegative().default(0),
  printColoursBack: z.coerce.number().int().nonnegative().default(0),
  hasSpotColour: z.coerce.boolean().default(false),
  spotColourNotes: z.string().max(500).optional().or(z.literal("")),
  finishing: z.array(z.string()).default([]),
  isFoodGrade: z.coerce.boolean().default(false),
  upsPerSheet: z.coerce.number().int().positive("Ups per sheet must be at least 1"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type BoxSpecFormValues = z.infer<typeof boxSpecFormSchema>;
