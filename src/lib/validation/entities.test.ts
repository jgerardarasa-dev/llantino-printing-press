import { describe, expect, it } from "vitest";

import { clientInsertSchema, materialInsertSchema, userInsertSchema } from "./entities";

describe("entity validation schemas", () => {
  it("accepts a valid client payload", () => {
    const result = clientInsertSchema.safeParse({
      companyName: "Manila Bay Bakeshop Inc.",
      paymentTermsDays: 30,
      creditLimitCentavos: 15000000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a client with no company name", () => {
    const result = clientInsertSchema.safeParse({ companyName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a material with a non-positive cost", () => {
    const result = materialInsertSchema.safeParse({
      name: "Test Board",
      type: "kraft",
      gsm: 300,
      sheetWidthIn: "25.00",
      sheetLengthIn: "38.00",
      costPerSheetCentavos: 0,
    });
    expect(result.success).toBe(false);
  });

  it("makes role optional (the column default 'staff' applies in Postgres)", () => {
    const result = userInsertSchema.safeParse({
      id: "00000000-0000-0000-0000-000000000000",
      fullName: "Test User",
      email: "test@llantino.ph",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a user with an invalid role", () => {
    const result = userInsertSchema.safeParse({
      id: "00000000-0000-0000-0000-000000000000",
      fullName: "Test User",
      email: "test@llantino.ph",
      role: "ceo",
    });
    expect(result.success).toBe(false);
  });
});
