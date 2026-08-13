import "server-only";

import { withUserContext } from "@/db/client";
import { settings } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import type { PriceTier } from "@/lib/pricing/types";
import { SETTINGS_KEYS } from "./keys";

export type AppSettings = {
  companyName: string;
  companyAddress: string;
  companyTin: string;
  companyPhone: string;
  companyEmail: string;
  /** Whether Llantino itself is VAT-registered — drives whether VAT applies at all (SPEC §13 open decision #2). */
  companyIsVatRegistered: boolean;
  vatPct: number;
  defaultMarkupPct: Record<PriceTier, number>;
  quotationValidityDays: number;
  spoilagePct: number;
  overheadPct: number;
  approvalMarkupFloorPct: number;
  approvalTotalCentavosThreshold: number;
  quoteNumberPrefix: string;
  joNumberPrefix: string;
};

/**
 * Placeholder values — SPEC §13 lists most of these as open decisions to
 * confirm with the client (VAT registration status, markup percentages,
 * approval threshold). The app must still run sensibly before those
 * answers exist, so every value here is also the fallback for any
 * `settings` row that hasn't been seeded/configured yet.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Llantino Printing Press",
  companyAddress: "",
  companyTin: "",
  companyPhone: "",
  companyEmail: "",
  companyIsVatRegistered: true,
  vatPct: 12,
  defaultMarkupPct: { standard: 35, preferred: 28, wholesale: 20 },
  quotationValidityDays: 30,
  spoilagePct: 5,
  overheadPct: 12,
  approvalMarkupFloorPct: 20,
  approvalTotalCentavosThreshold: 10_000_000, // ₱100,000.00
  quoteNumberPrefix: "QT",
  joNumberPrefix: "JO",
};

export async function getSettings(user: CurrentUser): Promise<AppSettings> {
  const rows = await withUserContext(user.id, async (tx) => tx.select().from(settings));
  const map = new Map(rows.map((r) => [r.key, r.value as Record<string, unknown>]));

  const companyInfo = map.get(SETTINGS_KEYS.COMPANY_INFO) ?? {};
  const vat = map.get(SETTINGS_KEYS.VAT) ?? {};
  const markup = map.get(SETTINGS_KEYS.DEFAULT_MARKUP_PCT) ?? {};
  const pricingDefaults = map.get(SETTINGS_KEYS.PRICING_DEFAULTS) ?? {};
  const approval = map.get(SETTINGS_KEYS.APPROVAL_THRESHOLDS) ?? {};
  const numbering = map.get(SETTINGS_KEYS.NUMBERING) ?? {};
  const validityDays = map.get(SETTINGS_KEYS.QUOTATION_VALIDITY_DAYS) as unknown as number | undefined;

  return {
    companyName: (companyInfo.name as string) ?? DEFAULT_SETTINGS.companyName,
    companyAddress: (companyInfo.address as string) ?? DEFAULT_SETTINGS.companyAddress,
    companyTin: (companyInfo.tin as string) ?? DEFAULT_SETTINGS.companyTin,
    companyPhone: (companyInfo.phone as string) ?? DEFAULT_SETTINGS.companyPhone,
    companyEmail: (companyInfo.email as string) ?? DEFAULT_SETTINGS.companyEmail,
    companyIsVatRegistered:
      (vat.companyIsVatRegistered as boolean) ?? DEFAULT_SETTINGS.companyIsVatRegistered,
    vatPct: (vat.vatPct as number) ?? DEFAULT_SETTINGS.vatPct,
    defaultMarkupPct: {
      standard: (markup.standard as number) ?? DEFAULT_SETTINGS.defaultMarkupPct.standard,
      preferred: (markup.preferred as number) ?? DEFAULT_SETTINGS.defaultMarkupPct.preferred,
      wholesale: (markup.wholesale as number) ?? DEFAULT_SETTINGS.defaultMarkupPct.wholesale,
    },
    quotationValidityDays: validityDays ?? DEFAULT_SETTINGS.quotationValidityDays,
    spoilagePct: (pricingDefaults.spoilagePct as number) ?? DEFAULT_SETTINGS.spoilagePct,
    overheadPct: (pricingDefaults.overheadPct as number) ?? DEFAULT_SETTINGS.overheadPct,
    approvalMarkupFloorPct:
      (approval.markupFloorPct as number) ?? DEFAULT_SETTINGS.approvalMarkupFloorPct,
    approvalTotalCentavosThreshold:
      (approval.totalCentavosThreshold as number) ?? DEFAULT_SETTINGS.approvalTotalCentavosThreshold,
    quoteNumberPrefix: (numbering.quotePrefix as string) ?? DEFAULT_SETTINGS.quoteNumberPrefix,
    joNumberPrefix: (numbering.joPrefix as string) ?? DEFAULT_SETTINGS.joNumberPrefix,
  };
}
