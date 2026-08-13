import { describe, expect, it } from "vitest";

import { computeQuote } from "./compute-quote";
import { computeQuoteTiers } from "./quantity-tiers";
import type { ProcessRateMap, QuoteInput } from "./types";

/**
 * Fixture rates in round numbers (not the seed data) so expected totals
 * in these tests can be hand-verified against SPEC §7's pseudocode line
 * by line.
 */
const RATES: ProcessRateMap = {
  offset_printing: { key: "offset_printing", label: "Offset Printing", unit: "per_sheet", rateCentavos: 150, setupFeeCentavos: 50_000, setupSheets: 150 },
  digital_printing: { key: "digital_printing", label: "Digital Printing", unit: "per_sheet", rateCentavos: 600, setupFeeCentavos: 0, setupSheets: 50 },
  plate: { key: "plate", label: "Plate", unit: "per_plate", rateCentavos: 35_000, setupFeeCentavos: 0, setupSheets: 0 },
  lamination_gloss: { key: "lamination_gloss", label: "Gloss Lamination", unit: "per_sheet", rateCentavos: 120, setupFeeCentavos: 30_000, setupSheets: 0 },
  spot_uv: { key: "spot_uv", label: "Spot UV", unit: "per_sheet", rateCentavos: 250, setupFeeCentavos: 80_000, setupSheets: 0 },
  foil_stamp: { key: "foil_stamp", label: "Foil Stamping", unit: "per_sheet", rateCentavos: 350, setupFeeCentavos: 120_000, setupSheets: 0 },
  die_cut: { key: "die_cut", label: "Die-Cutting", unit: "per_sheet", rateCentavos: 80, setupFeeCentavos: 50_000, setupSheets: 0 },
  die_making: { key: "die_making", label: "Die Making", unit: "per_job", rateCentavos: 350_000, setupFeeCentavos: 0, setupSheets: 0 },
  gluing: { key: "gluing", label: "Gluing", unit: "per_piece", rateCentavos: 35, setupFeeCentavos: 20_000, setupSheets: 0 },
  packing: { key: "packing", label: "Packing", unit: "per_piece", rateCentavos: 20, setupFeeCentavos: 0, setupSheets: 0 },
  stripping: { key: "stripping", label: "Stripping", unit: "per_sheet", rateCentavos: 30, setupFeeCentavos: 0, setupSheets: 0 },
};

const BASE_SETTINGS: QuoteInput["settings"] = {
  spoilagePct: 5,
  overheadPct: 12,
  vatPct: 12,
  applyVat: true,
  approvalMarkupFloorPct: 20,
  approvalTotalCentavosThreshold: 100_000_000, // ₱1,000,000 — effectively "never" for these tests
};

function baseInput(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    quantity: 1000,
    boxSpec: {
      upsPerSheet: 8,
      printColoursFront: 4,
      printColoursBack: 0,
      spotColourCount: 0,
      finishing: [],
    },
    material: { costPerSheetCentavos: 950 },
    printMethod: "offset",
    isRepeatOrder: false,
    rates: RATES,
    settings: BASE_SETTINGS,
    priceTier: "standard",
    ...overrides,
  };
}

describe("computeQuote — standard 4-colour box", () => {
  const result = computeQuote(baseInput());

  it("computes sheets: net, makeready, total", () => {
    // netSheets = ceil(1000/8) = 125; +5% spoilage = ceil(131.25) = 132; +150 makeready = 282
    expect(result.sheets.netSheets).toBe(125);
    expect(result.sheets.makereadySheets).toBe(150);
    expect(result.sheets.totalSheets).toBe(282);
  });

  it("costs material as total_sheets * cost_per_sheet", () => {
    const material = result.lines.find((l) => l.key === "material")!;
    expect(material.amountCentavos).toBe(282 * 950); // 267,900
  });

  it("costs plates as colour_count * plate_rate for a new design", () => {
    const plates = result.lines.find((l) => l.key === "plates")!;
    expect(plates.amountCentavos).toBe(4 * 35_000); // 140,000
  });

  it("costs printing as impressions * rate + setup, single-sided", () => {
    const printing = result.lines.find((l) => l.key === "printing")!;
    // single-sided (no back colours) => impressions = totalSheets = 282
    expect(printing.amountCentavos).toBe(282 * 150 + 50_000); // 92,300
  });

  it("includes die making for a new design plus die-cutting", () => {
    const dieMaking = result.lines.find((l) => l.key === "die_making")!;
    const dieCutting = result.lines.find((l) => l.key === "die_cutting")!;
    expect(dieMaking.amountCentavos).toBe(350_000);
    expect(dieCutting.amountCentavos).toBe(282 * 80 + 50_000); // 72,560
  });

  it("costs gluing/packing per piece and stripping per sheet", () => {
    expect(result.lines.find((l) => l.key === "gluing")!.amountCentavos).toBe(1000 * 35 + 20_000);
    expect(result.lines.find((l) => l.key === "packing")!.amountCentavos).toBe(1000 * 20);
    expect(result.lines.find((l) => l.key === "stripping")!.amountCentavos).toBe(282 * 30);
  });

  it("sums direct cost from every line", () => {
    expect(result.directCostCentavos).toBe(1_006_220);
  });

  it("applies overhead, standard-tier markup, VAT, and rounds unit price up to the nearest ₱0.05", () => {
    expect(result.overheadCentavos).toBe(120_746); // round(1,006,220 * 0.12)
    expect(result.totalCostCentavos).toBe(1_126_966);
    expect(result.markupPct).toBe(35); // standard tier default
    expect(result.sellingPriceCentavos).toBe(1_521_404);
    expect(result.unitPriceCentavos).toBe(1525); // ceil(1521.404 / 5) * 5, i.e. ₱15.25
    expect(result.unitPriceCentavos % 5).toBe(0);
    expect(result.lineTotalCentavos).toBe(1_525_000);
    expect(result.vatCentavos).toBe(183_000); // 12% of 1,525,000
    expect(result.grandTotalCentavos).toBe(1_708_000);
  });

  it("does not require approval at the default markup and threshold", () => {
    expect(result.requiresApproval).toBe(false);
    expect(result.approvalReasons).toHaveLength(0);
  });

  it("gives every line a share of direct cost that sums to ~100%", () => {
    const total = result.lines.reduce((sum, l) => sum + l.pctOfDirectCost, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });
});

describe("computeQuote — repeat order", () => {
  it("skips plates and die-making, and is materially cheaper than a new design", () => {
    const newDesign = computeQuote(baseInput());
    const repeat = computeQuote(baseInput({ isRepeatOrder: true }));

    expect(repeat.lines.find((l) => l.key === "plates")).toBeUndefined();
    expect(repeat.lines.find((l) => l.key === "die_making")).toBeUndefined();
    // die-cutting itself still happens on a repeat order — only the
    // one-time plate/die-making costs are skipped.
    expect(repeat.lines.find((l) => l.key === "die_cutting")).toBeDefined();
    expect(repeat.directCostCentavos).toBeLessThan(newDesign.directCostCentavos);
    expect(repeat.unitPriceCentavos).toBeLessThan(newDesign.unitPriceCentavos);
  });

  it("respects an explicit isNewDesign override even on a repeat order", () => {
    const result = computeQuote(baseInput({ isRepeatOrder: true, isNewDesign: true }));
    expect(result.lines.find((l) => l.key === "die_making")).toBeDefined();
  });
});

describe("computeQuote — digital short run", () => {
  it("uses the digital rate/makeready and skips plates entirely", () => {
    const result = computeQuote(
      baseInput({
        quantity: 100,
        printMethod: "digital",
        boxSpec: { upsPerSheet: 8, printColoursFront: 4, printColoursBack: 0, spotColourCount: 0, finishing: [] },
      })
    );

    // netSheets = ceil(100/8) = 13; +5% = ceil(13.65) = 14; +50 makeready = 64
    expect(result.sheets.totalSheets).toBe(64);
    expect(result.lines.find((l) => l.key === "plates")).toBeUndefined();
    const printing = result.lines.find((l) => l.key === "printing")!;
    expect(printing.amountCentavos).toBe(64 * 600); // no digital setup fee in fixture
  });
});

describe("computeQuote — spot UV + foil combo, double-sided", () => {
  it("costs each finishing process and doubles impressions for two-sided print", () => {
    const result = computeQuote(
      baseInput({
        boxSpec: {
          upsPerSheet: 10,
          printColoursFront: 4,
          printColoursBack: 4,
          spotColourCount: 1,
          finishing: ["spot_uv", "foil_stamp"],
        },
      })
    );

    const spotUv = result.lines.find((l) => l.key === "spot_uv")!;
    const foil = result.lines.find((l) => l.key === "foil_stamp")!;
    expect(spotUv.amountCentavos).toBe(result.sheets.totalSheets * 250 + 80_000);
    expect(foil.amountCentavos).toBe(result.sheets.totalSheets * 350 + 120_000);

    const printing = result.lines.find((l) => l.key === "printing")!;
    expect(printing.amountCentavos).toBe(result.sheets.totalSheets * 2 * 150 + 50_000);

    // 4 front + 4 back + 1 spot = 9 plates
    const plates = result.lines.find((l) => l.key === "plates")!;
    expect(plates.amountCentavos).toBe(9 * 35_000);
  });

  it("never double-counts a reserved key even if it's mistakenly listed in finishing", () => {
    const result = computeQuote(
      baseInput({ boxSpec: { ...baseInput().boxSpec, finishing: ["gluing", "spot_uv"] } })
    );
    const gluingLines = result.lines.filter((l) => l.key === "gluing");
    expect(gluingLines).toHaveLength(1);
  });
});

describe("computeQuote — quantity tiers amortise one-time costs", () => {
  it("drops unit price as quantity increases (plates/die spread over more units)", () => {
    const { quantity: _quantity, ...tierInput } = baseInput();
    void _quantity;
    const tiers = computeQuoteTiers(tierInput, [1000, 3000, 5000]);
    // Sanity: tiers computed at the requested quantities, in order.
    expect(tiers.map((t) => t.quantity)).toEqual([1000, 3000, 5000]);

    const [t1000, t3000, t5000] = tiers;
    expect(t3000.breakdown.unitPriceCentavos).toBeLessThan(t1000.breakdown.unitPriceCentavos);
    expect(t5000.breakdown.unitPriceCentavos).toBeLessThan(t3000.breakdown.unitPriceCentavos);

    // The flat plate + die-making cost is identical at every tier...
    const plateCost = (t: (typeof tiers)[number]) =>
      t.breakdown.lines.find((l) => l.key === "plates")!.amountCentavos;
    expect(plateCost(t1000)).toBe(plateCost(t3000));
    expect(plateCost(t3000)).toBe(plateCost(t5000));
  });
});

describe("computeQuote — VAT on/off", () => {
  it("adds VAT on top of the line total when applyVat is true", () => {
    const result = computeQuote(baseInput());
    expect(result.vatCentavos).toBeGreaterThan(0);
    expect(result.grandTotalCentavos).toBe(result.lineTotalCentavos + result.vatCentavos);
  });

  it("charges no VAT and grand total equals line total when applyVat is false", () => {
    const result = computeQuote(baseInput({ settings: { ...BASE_SETTINGS, applyVat: false } }));
    expect(result.vatCentavos).toBe(0);
    expect(result.grandTotalCentavos).toBe(result.lineTotalCentavos);
  });
});

describe("computeQuote — rounding", () => {
  it("always rounds the unit price up to a multiple of ₱0.05 (5 centavos)", () => {
    for (const quantity of [1, 7, 111, 999, 1234, 10_000]) {
      const result = computeQuote(baseInput({ quantity }));
      expect(result.unitPriceCentavos % 5).toBe(0);
      expect(result.unitPriceCentavos * quantity).toBeGreaterThanOrEqual(result.sellingPriceCentavos);
    }
  });

  it("every line total and every rollup figure is an integer (no fractional centavos)", () => {
    const result = computeQuote(baseInput());
    for (const line of result.lines) {
      expect(Number.isInteger(line.amountCentavos)).toBe(true);
    }
    expect(Number.isInteger(result.overheadCentavos)).toBe(true);
    expect(Number.isInteger(result.sellingPriceCentavos)).toBe(true);
    expect(Number.isInteger(result.vatCentavos)).toBe(true);
    expect(Number.isInteger(result.grandTotalCentavos)).toBe(true);
  });
});

describe("computeQuote — manual overrides", () => {
  it("uses the overridden amount in totals but keeps the computed value for display", () => {
    const withoutOverride = computeQuote(baseInput());
    const materialComputed = withoutOverride.lines.find((l) => l.key === "material")!.amountCentavos;

    const result = computeQuote(
      baseInput({ overrides: { material: { amountCentavos: materialComputed + 10_000, reason: "Supplier surcharge this week" } } })
    );

    const material = result.lines.find((l) => l.key === "material")!;
    expect(material.isOverridden).toBe(true);
    expect(material.amountCentavos).toBe(materialComputed + 10_000);
    expect(material.computedAmountCentavos).toBe(materialComputed);
    expect(material.overrideReason).toBe("Supplier surcharge this week");
    expect(result.directCostCentavos).toBe(withoutOverride.directCostCentavos + 10_000);
  });
});

describe("computeQuote — approval threshold", () => {
  it("flags for approval when markup falls below the configured floor", () => {
    const result = computeQuote(baseInput({ markupPctOverride: 10 }));
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalReasons.some((r) => r.includes("Markup"))).toBe(true);
  });

  it("flags for approval when the grand total exceeds the configured threshold", () => {
    const result = computeQuote(
      baseInput({ settings: { ...BASE_SETTINGS, approvalTotalCentavosThreshold: 100 } })
    );
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalReasons.some((r) => r.includes("threshold"))).toBe(true);
  });

  it("does not flag a normal quote within floor and threshold", () => {
    const result = computeQuote(baseInput());
    expect(result.requiresApproval).toBe(false);
  });
});

describe("computeQuote — input validation", () => {
  it("throws on non-positive quantity", () => {
    expect(() => computeQuote(baseInput({ quantity: 0 }))).toThrow();
  });

  it("throws on non-positive ups_per_sheet", () => {
    expect(() =>
      computeQuote(baseInput({ boxSpec: { ...baseInput().boxSpec, upsPerSheet: 0 } }))
    ).toThrow();
  });

  it("throws when a required process rate is missing", () => {
    const { die_making: _dieMaking, ...ratesWithoutDieMaking } = RATES;
    void _dieMaking;
    expect(() => computeQuote(baseInput({ rates: ratesWithoutDieMaking }))).toThrow(/die_making/);
  });
});
