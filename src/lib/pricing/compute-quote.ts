import { applyPercent, roundUpToStep } from "./rounding";
import { DEFAULT_MARKUP_PCT, type ProcessRate, type QuoteBreakdown, type QuoteInput, type QuoteLine } from "./types";

/**
 * Process keys costed by their own dedicated algorithm step — never
 * double-counted as a generic "finishing" line even if a caller
 * mistakenly includes one in box_spec.finishing.
 */
const RESERVED_KEYS = new Set([
  "plate",
  "offset_printing",
  "digital_printing",
  "die_cut",
  "die_making",
  "gluing",
  "packing",
  "stripping",
]);

function getRate(rates: QuoteInput["rates"], key: string): ProcessRate {
  const rate = rates[key];
  if (!rate) {
    throw new Error(`computeQuote: missing process rate "${key}". Seed/activate it first.`);
  }
  return rate;
}

function costProcess(rate: ProcessRate, quantity: number, totalSheets: number): number {
  switch (rate.unit) {
    case "per_sheet":
      return totalSheets * rate.rateCentavos + rate.setupFeeCentavos;
    case "per_piece":
      return quantity * rate.rateCentavos + rate.setupFeeCentavos;
    case "per_plate":
      // Plate count is applied by the caller (step 3); per_plate rates
      // reaching here via generic finishing would be a spec error.
      return rate.rateCentavos + rate.setupFeeCentavos;
    case "per_job":
      return rate.rateCentavos + rate.setupFeeCentavos;
    case "per_sqin":
      // Out of scope for the MVP (no per-sqin process is seeded), but
      // handled rather than silently mis-costed if one is added later.
      return quantity * rate.rateCentavos + rate.setupFeeCentavos;
    default:
      return rate.rateCentavos + rate.setupFeeCentavos;
  }
}

/**
 * Pure function — SPEC §7. No I/O, no DB access; Server Actions load
 * materials/rates/settings and pass them in. Every dollar amount in and
 * out is integer centavos.
 */
export function computeQuote(input: QuoteInput): QuoteBreakdown {
  const { quantity, boxSpec, material, rates, settings } = input;

  if (quantity <= 0) throw new Error("computeQuote: quantity must be positive.");
  if (boxSpec.upsPerSheet <= 0) throw new Error("computeQuote: ups_per_sheet must be positive.");

  const overrides = input.overrides ?? {};
  const lines: QuoteLine[] = [];

  function addLine(key: string, label: string, computedAmountCentavos: number) {
    const override = overrides[key];
    lines.push({
      key,
      label,
      computedAmountCentavos,
      amountCentavos: override ? override.amountCentavos : computedAmountCentavos,
      isOverridden: Boolean(override),
      overrideReason: override?.reason,
      pctOfDirectCost: 0, // filled in once directCostCentavos is known
    });
  }

  // ---------------------------------------------------------------------
  // 1. SHEETS
  // ---------------------------------------------------------------------
  const printRate = getRate(rates, input.printMethod === "offset" ? "offset_printing" : "digital_printing");
  const netSheets = Math.ceil(quantity / boxSpec.upsPerSheet);
  const makereadySheets = printRate.setupSheets;
  const totalSheets = Math.ceil(netSheets * (1 + settings.spoilagePct / 100)) + makereadySheets;

  // ---------------------------------------------------------------------
  // 2. MATERIAL
  // ---------------------------------------------------------------------
  const materialCost = totalSheets * material.costPerSheetCentavos;
  addLine("material", "Board / material", materialCost);

  // ---------------------------------------------------------------------
  // 3. PLATES (offset only; skipped on repeat orders — plates already exist)
  // ---------------------------------------------------------------------
  if (input.printMethod === "offset" && !input.isRepeatOrder) {
    const plateRate = getRate(rates, "plate");
    const plateCount = boxSpec.printColoursFront + boxSpec.printColoursBack + boxSpec.spotColourCount;
    const plateCost = plateCount * plateRate.rateCentavos;
    addLine("plates", `Plates (${plateCount})`, plateCost);
  }

  // ---------------------------------------------------------------------
  // 4. PRINTING
  // ---------------------------------------------------------------------
  const isDoubleSided = boxSpec.printColoursBack > 0;
  const impressions = totalSheets * (isDoubleSided ? 2 : 1);
  const printingCost = impressions * printRate.rateCentavos + printRate.setupFeeCentavos;
  addLine("printing", input.printMethod === "offset" ? "Offset printing" : "Digital printing", printingCost);

  // ---------------------------------------------------------------------
  // 5. FINISHING (data-driven: any selected process_rates key not
  //    already costed by a dedicated step below)
  // ---------------------------------------------------------------------
  for (const key of boxSpec.finishing) {
    if (RESERVED_KEYS.has(key)) continue;
    const rate = getRate(rates, key);
    addLine(key, rate.label, costProcess(rate, quantity, totalSheets));
  }

  // ---------------------------------------------------------------------
  // 6. DIE
  // ---------------------------------------------------------------------
  const isNewDesign = input.isNewDesign ?? !input.isRepeatOrder;
  if (isNewDesign) {
    const dieMakingRate = getRate(rates, "die_making");
    addLine("die_making", "Die making (new design)", dieMakingRate.rateCentavos + dieMakingRate.setupFeeCentavos);
  }
  const dieCutRate = getRate(rates, "die_cut");
  addLine("die_cutting", "Die-cutting", costProcess(dieCutRate, quantity, totalSheets));

  // ---------------------------------------------------------------------
  // 7. CONVERTING
  // ---------------------------------------------------------------------
  const gluingRate = getRate(rates, "gluing");
  addLine("gluing", "Gluing", costProcess(gluingRate, quantity, totalSheets));

  const packingRate = getRate(rates, "packing");
  addLine("packing", "Packing", costProcess(packingRate, quantity, totalSheets));

  // Stripping isn't named in SPEC §7's converting step, but it's a real,
  // separately-seeded converting process (waste removal after die-
  // cutting) — costed here as part of converting whenever it's an active
  // rate, so the seeded rate isn't dead data. Optional: skip cleanly if
  // not seeded/activated.
  const strippingRate = rates["stripping"];
  if (strippingRate) {
    addLine("stripping", strippingRate.label, costProcess(strippingRate, quantity, totalSheets));
  }

  // ---------------------------------------------------------------------
  // 8. TOTALS
  // ---------------------------------------------------------------------
  const directCostCentavos = lines.reduce((sum, l) => sum + l.amountCentavos, 0);
  for (const line of lines) {
    line.pctOfDirectCost = directCostCentavos > 0
      ? Math.round((line.amountCentavos / directCostCentavos) * 1000) / 10
      : 0;
  }

  const overheadCentavos = applyPercent(directCostCentavos, settings.overheadPct);
  const totalCostCentavos = directCostCentavos + overheadCentavos;

  const markupPct = input.markupPctOverride ?? DEFAULT_MARKUP_PCT[input.priceTier];
  const sellingPriceCentavos = totalCostCentavos + applyPercent(totalCostCentavos, markupPct);

  const rawUnitPriceCentavos = sellingPriceCentavos / quantity;
  const unitPriceCentavos = roundUpToStep(rawUnitPriceCentavos, 5);
  const lineTotalCentavos = unitPriceCentavos * quantity;

  const vatCentavos = settings.applyVat ? applyPercent(lineTotalCentavos, settings.vatPct) : 0;
  const grandTotalCentavos = lineTotalCentavos + vatCentavos;

  const approvalReasons: string[] = [];
  if (markupPct < settings.approvalMarkupFloorPct) {
    approvalReasons.push(
      `Markup ${markupPct}% is below the ${settings.approvalMarkupFloorPct}% approval floor.`
    );
  }
  if (grandTotalCentavos > settings.approvalTotalCentavosThreshold) {
    approvalReasons.push("Quote total exceeds the management approval threshold.");
  }

  return {
    sheets: { netSheets, makereadySheets, totalSheets },
    lines,
    directCostCentavos,
    overheadCentavos,
    totalCostCentavos,
    markupPct,
    sellingPriceCentavos,
    unitPriceCentavos,
    vatCentavos,
    grandTotalCentavos,
    lineTotalCentavos,
    requiresApproval: approvalReasons.length > 0,
    approvalReasons,
  };
}
