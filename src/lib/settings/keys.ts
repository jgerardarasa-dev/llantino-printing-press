/** Keys into the `settings` key/value table. Keep in sync with get-settings.ts and scripts/seed-data.ts. */
export const SETTINGS_KEYS = {
  COMPANY_INFO: "company_info",
  VAT: "vat",
  DEFAULT_MARKUP_PCT: "default_markup_pct",
  QUOTATION_VALIDITY_DAYS: "quotation_validity_days",
  PRICING_DEFAULTS: "pricing_defaults",
  APPROVAL_THRESHOLDS: "approval_thresholds",
  NUMBERING: "numbering",
} as const;
