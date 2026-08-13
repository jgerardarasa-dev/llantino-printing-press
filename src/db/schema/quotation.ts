import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { users } from "./core";
import { clients, leads } from "./crm";
import { boxSpecs } from "./product";
import { quotationStatusEnum } from "./enums";

export const quotations = pgTable("quotations", {
  ...baseColumns(),
  quoteNumber: text("quote_number").notNull().unique(),
  clientId: uuid("client_id").references(() => clients.id),
  leadId: uuid("lead_id").references(() => leads.id),
  preparedBy: uuid("prepared_by")
    .notNull()
    .references(() => users.id),
  status: quotationStatusEnum("status").notNull().default("draft"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  currency: text("currency").notNull().default("PHP"),
  subtotalCentavos: centavos("subtotal_centavos").notNull().default(0),
  vatCentavos: centavos("vat_centavos").notNull().default(0),
  totalCentavos: centavos("total_centavos").notNull().default(0),
  markupPct: integer("markup_pct_bps").notNull().default(3500), // basis points, 3500 = 35.00%
  notes: text("notes"),
  terms: text("terms"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  rejectedReason: text("rejected_reason"),
  revisionOfQuotationId: uuid("revision_of_quotation_id"),
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id),
});

export const quotationItems = pgTable("quotation_items", {
  ...baseColumns(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id),
  boxSpecId: uuid("box_spec_id").references(() => boxSpecs.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  /**
   * Full computeQuote() output snapshot, frozen at quote time. Never
   * recompute historical quotes from current rates — this jsonb blob is
   * the source of truth for what the client was shown.
   */
  costBreakdown: jsonb("cost_breakdown").notNull(),
  unitPriceCentavos: centavos("unit_price_centavos").notNull(),
  lineTotalCentavos: centavos("line_total_centavos").notNull(),
  leadTimeDays: integer("lead_time_days"),
  createdBy: uuid("created_by").references(() => users.id),
});

/** So one quote shows price at e.g. 1,000 / 3,000 / 5,000 pcs. */
export const quotationTiers = pgTable("quotation_tiers", {
  ...baseColumns(),
  quotationItemId: uuid("quotation_item_id")
    .notNull()
    .references(() => quotationItems.id),
  quantity: integer("quantity").notNull(),
  unitPriceCentavos: centavos("unit_price_centavos").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});
