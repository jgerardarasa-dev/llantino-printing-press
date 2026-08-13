import { boolean, date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import {
  clientPriceTierEnum,
  clientSourceEnum,
  clientStatusEnum,
  interactionTypeEnum,
  leadStageEnum,
} from "./enums";
import { users } from "./core";

export const clients = pgTable("clients", {
  ...baseColumns(),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  industry: text("industry"),
  tin: text("tin"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  region: text("region"),
  isVatRegistered: boolean("is_vat_registered").notNull().default(false),
  paymentTermsDays: integer("payment_terms_days").notNull().default(30),
  creditLimitCentavos: centavos("credit_limit_centavos").notNull().default(0),
  priceTier: clientPriceTierEnum("price_tier").notNull().default("standard"),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  source: clientSourceEnum("source").notNull().default("other"),
  status: clientStatusEnum("status").notNull().default("prospect"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const contacts = pgTable("contacts", {
  ...baseColumns(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  mobile: text("mobile"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
});

export const leads = pgTable("leads", {
  ...baseColumns(),
  name: text("name").notNull(),
  company: text("company"),
  contact: text("contact"),
  source: clientSourceEnum("source").notNull().default("other"),
  inquirySummary: text("inquiry_summary"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  stage: leadStageEnum("stage").notNull().default("new"),
  lostReason: text("lost_reason"),
  convertedClientId: uuid("converted_client_id").references(() => clients.id),
  createdBy: uuid("created_by").references(() => users.id),
});

export const interactions = pgTable("interactions", {
  ...baseColumns(),
  clientId: uuid("client_id").references(() => clients.id),
  leadId: uuid("lead_id").references(() => leads.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: interactionTypeEnum("type").notNull(),
  summary: text("summary").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date", { mode: "string" }),
  createdBy: uuid("created_by").references(() => users.id),
});
