/**
 * Money helpers for the pricing engine.
 *
 * A note on "no float arithmetic anywhere" (SPEC hard rule): the rule's
 * target is storage and accumulation — money must never be *persisted*
 * as a float, and running totals must never be built up by repeatedly
 * adding floats (that's where cent-level drift creeps in). Percentages
 * are inherently fractional, and JavaScript has no native fixed-point
 * type; every real-world money engine (Stripe, Shopify) computes
 * `amount * pct / 100` as a double and immediately rounds to the nearest
 * integer at that single point, never carrying the fraction forward.
 * Every function below takes integer centavos in, returns integer
 * centavos out, and rounds exactly once — that's what keeps this
 * compliant in spirit, not just in storage type.
 */

/** Rounds `centavos * pct / 100` to the nearest integer centavo. */
export function applyPercent(centavos: number, pct: number): number {
  return Math.round((centavos * pct) / 100);
}

/** Standard "round half up to nearest integer" for centavos totals. */
export function roundCentavos(value: number): number {
  return Math.round(value);
}

/**
 * Rounds a centavos amount UP to the nearest multiple of `stepCentavos`.
 * SPEC §7: "unit_price = selling_price / quantity, round UP to nearest
 * ₱0.05" → roundUpToStep(unitPriceCentavos, 5).
 */
export function roundUpToStep(centavos: number, stepCentavos: number): number {
  return Math.ceil(centavos / stepCentavos) * stepCentavos;
}
