import { z } from "zod";

/**
 * Client-facing shape for the client create/edit form — friendlier types
 * than the raw DB columns (pesos instead of centavos, checkbox booleans)
 * translated in the Server Action before hitting clientInsertSchema /
 * clientUpdateSchema. This is the schema react-hook-form validates
 * against on the client AND the Server Action re-validates against on
 * the server (SPEC hard rule: never trust client-side validation alone).
 */
export const clientFormSchema = z.object({
  id: z.string().uuid().optional(),
  companyName: z.string().min(1, "Company name is required").max(200),
  tradeName: z.string().max(200).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  tin: z.string().max(40).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  region: z.string().max(120).optional().or(z.literal("")),
  isVatRegistered: z.coerce.boolean().default(false),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  creditLimitPesos: z.coerce.number().min(0).default(0),
  priceTier: z.enum(["standard", "preferred", "wholesale"]).default("standard"),
  ownerUserId: z.string().uuid("Assign an account owner"),
  source: z
    .enum(["walk_in", "referral", "meta_ads", "website", "facebook", "other"])
    .default("other"),
  status: z.enum(["lead", "prospect", "active", "dormant", "lost"]).default("prospect"),
  notes: z.string().max(4000).optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
