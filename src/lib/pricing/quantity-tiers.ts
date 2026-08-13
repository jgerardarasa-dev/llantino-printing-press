import { computeQuote } from "./compute-quote";
import type { QuoteBreakdown, QuoteInput } from "./types";

export type QuoteTierResult = {
  quantity: number;
  breakdown: QuoteBreakdown;
};

/**
 * Computes the same quote at several quantities simultaneously (SPEC §7:
 * "compute the same quote at 3 quantities simultaneously ... one-time
 * costs (plates, die) amortise over quantity"). No special amortization
 * logic is needed here — plates/die-making are flat one-time amounts
 * inside computeQuote's direct cost regardless of quantity, so a larger
 * quantity naturally divides that fixed cost over more units when
 * unit_price = selling_price / quantity is taken. This just runs the
 * pure function once per quantity and returns them together for the
 * comparison table.
 *
 * Per-tier overrides aren't supported — overrides are keyed by line, not
 * by quantity, and apply identically at every tier.
 */
export function computeQuoteTiers(
  input: Omit<QuoteInput, "quantity">,
  quantities: number[]
): QuoteTierResult[] {
  return quantities.map((quantity) => ({
    quantity,
    breakdown: computeQuote({ ...input, quantity }),
  }));
}
