import { z } from "zod";

const lineOverrideSchema = z.object({
  amountCentavos: z.number().int(),
  reason: z.string().min(1, "An override needs a reason"),
});

/**
 * What the quotation builder submits. The Server Action re-fetches box
 * spec / material / process rates / settings fresh from the DB and
 * re-runs computeQuote() itself — this payload is never trusted as the
 * source of the actual cost breakdown, only as the *inputs* to it.
 */
export const quotationFormSchema = z.object({
  clientId: z.string().uuid("Select a client"),
  boxSpecId: z.string().uuid("Select a box spec"),
  printMethod: z.enum(["offset", "digital"]).default("offset"),
  isRepeatOrder: z.coerce.boolean().default(false),
  previousJobOrderId: z.string().uuid().optional().or(z.literal("")),
  quantity1: z.coerce.number().int().positive(),
  quantity2: z.coerce.number().int().positive(),
  quantity3: z.coerce.number().int().positive(),
  markupPctOverride: z.coerce.number().min(0).max(500).optional(),
  applyVat: z.coerce.boolean().default(true),
  spotColourCount: z.coerce.number().int().nonnegative().default(0),
  leadTimeDays: z.coerce.number().int().nonnegative().optional(),
  validUntil: z.string().min(1, "Set a validity date"),
  notes: z.string().max(4000).optional().or(z.literal("")),
  terms: z.string().max(4000).optional().or(z.literal("")),
  /** JSON-encoded Record<lineKey, {amountCentavos, reason}>. */
  overridesJson: z.string().optional(),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export function parseOverrides(json: string | undefined) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const result: Record<string, { amountCentavos: number; reason: string }> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const r = lineOverrideSchema.safeParse(value);
      if (r.success) result[key] = r.data;
    }
    return result;
  } catch {
    return {};
  }
}
