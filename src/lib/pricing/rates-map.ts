import type { ProcessRateMap, ProcessRateUnit } from "./types";

type RateSource = {
  key: string;
  label: string;
  unit: ProcessRateUnit;
  rateCentavos: number;
  setupFeeCentavos: number;
  setupSheets: number;
  isActive: boolean;
};

/**
 * Converts DB process_rates rows into the key->rate map computeQuote
 * expects. Deliberately takes a structurally-typed row rather than
 * importing the Drizzle row type from lib/data — this file (like the
 * rest of lib/pricing) has no server-only dependency so it can be
 * imported directly into a Client Component for the live breakdown
 * preview.
 */
export function toRatesMap(rows: RateSource[]): ProcessRateMap {
  const map: ProcessRateMap = {};
  for (const row of rows) {
    if (!row.isActive) continue;
    map[row.key] = {
      key: row.key,
      label: row.label,
      unit: row.unit,
      rateCentavos: row.rateCentavos,
      setupFeeCentavos: row.setupFeeCentavos,
      setupSheets: row.setupSheets,
    };
  }
  return map;
}
