/**
 * Types for the quotation pricing engine (SPEC §7). Kept independent of
 * the Drizzle schema types so `computeQuote` stays a pure function with
 * no DB/ORM dependency — callers (Server Actions) map DB rows into this
 * shape.
 */

export type ProcessRateUnit = "per_sheet" | "per_piece" | "per_plate" | "per_job" | "per_sqin";

export type ProcessRate = {
  key: string;
  label: string;
  unit: ProcessRateUnit;
  rateCentavos: number;
  setupFeeCentavos: number;
  /** Makeready/setup waste sheets — only meaningful for offset/digital printing. */
  setupSheets: number;
};

/** key -> rate. Only the rates actually needed for the quote must be present. */
export type ProcessRateMap = Record<string, ProcessRate>;

export type PriceTier = "standard" | "preferred" | "wholesale";

export const DEFAULT_MARKUP_PCT: Record<PriceTier, number> = {
  standard: 35,
  preferred: 28,
  wholesale: 20,
};

/** A single line the sales rep sees in the cost breakdown. */
export type QuoteLine = {
  key: string;
  label: string;
  /** The amount actually used in the totals (computed, or the override). */
  amountCentavos: number;
  /** What the formula produced, even when overridden — shown struck through in the UI. */
  computedAmountCentavos: number;
  isOverridden: boolean;
  overrideReason?: string;
  /** Share of direct cost this line represents, 0–100, rounded to 1 decimal. */
  pctOfDirectCost: number;
};

export type LineOverride = { amountCentavos: number; reason: string };

export type QuoteInput = {
  quantity: number;

  boxSpec: {
    /** Manual entry in the MVP — see SPEC §7's "ups calculation note". */
    upsPerSheet: number;
    printColoursFront: number;
    printColoursBack: number;
    /** Extra spot/Pantone colours beyond front+back process colours. */
    spotColourCount: number;
    /** process_rates keys selected as finishing, e.g. ["lamination_gloss", "spot_uv"]. */
    finishing: string[];
  };

  material: {
    costPerSheetCentavos: number;
  };

  printMethod: "offset" | "digital";

  /**
   * Repeat order: same design as a previous JO — no new plates, no new
   * die, near-instant to quote (SPEC §7). Defaults isNewDesign to false
   * when true, unless isNewDesign is explicitly passed.
   */
  isRepeatOrder: boolean;
  /** Explicit override; otherwise defaults to `!isRepeatOrder`. */
  isNewDesign?: boolean;

  rates: ProcessRateMap;

  settings: {
    /** e.g. 5 for 5% spoilage. */
    spoilagePct: number;
    /** e.g. 12 for 12% overhead. */
    overheadPct: number;
    /** e.g. 12 for 12% VAT. */
    vatPct: number;
    applyVat: boolean;
    /** Below this markup %, the quote should require management approval. */
    approvalMarkupFloorPct: number;
    /** Above this grand total, the quote should require management approval. */
    approvalTotalCentavosThreshold: number;
  };

  /** Percent, e.g. 35 for 35%. Defaults from DEFAULT_MARKUP_PCT[priceTier]. */
  markupPctOverride?: number;
  priceTier: PriceTier;

  /** Manual overrides keyed by QuoteLine.key, e.g. { material: {...} }. */
  overrides?: Partial<Record<string, LineOverride>>;
};

export type QuoteBreakdown = {
  sheets: {
    netSheets: number;
    makereadySheets: number;
    totalSheets: number;
  };
  lines: QuoteLine[];
  directCostCentavos: number;
  overheadCentavos: number;
  totalCostCentavos: number;
  markupPct: number;
  sellingPriceCentavos: number;
  /** Rounded UP to the nearest ₱0.05, per SPEC §7. */
  unitPriceCentavos: number;
  vatCentavos: number;
  grandTotalCentavos: number;
  /** unitPriceCentavos * quantity — what actually gets billed at that rounded rate. */
  lineTotalCentavos: number;
  requiresApproval: boolean;
  approvalReasons: string[];
};
