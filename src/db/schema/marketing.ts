import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { users } from "./core";

/**
 * Manual monthly ad spend entry (SPEC §8 — Meta Ads section). No live
 * Marketing API integration in the MVP; this table lets the system still
 * compute cost-per-lead and cost-per-won-client by joining against
 * leads.source = 'meta_ads' and their resulting job orders.
 * See lib/integrations/meta/ for the Phase 2 API stub.
 */
export const adSpend = pgTable("ad_spend", {
  ...baseColumns(),
  month: date("month", { mode: "string" }).notNull(),
  platform: text("platform").notNull().default("meta"),
  campaignName: text("campaign_name"),
  spendCentavos: centavos("spend_centavos").notNull(),
  leadsGenerated: integer("leads_generated").notNull().default(0),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});
