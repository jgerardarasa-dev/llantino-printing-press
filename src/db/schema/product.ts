import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { attachments, users } from "./core";
import { clients } from "./crm";
import { boxStyleEnum, dieConditionEnum, materialTypeEnum, processRateUnitEnum } from "./enums";

export const materials = pgTable("materials", {
  ...baseColumns(),
  name: text("name").notNull(),
  type: materialTypeEnum("type").notNull(),
  gsm: integer("gsm").notNull(),
  sheetWidthIn: numeric("sheet_width_in", { precision: 6, scale: 2 }).notNull(),
  sheetLengthIn: numeric("sheet_length_in", { precision: 6, scale: 2 }).notNull(),
  costPerSheetCentavos: centavos("cost_per_sheet_centavos").notNull(),
  supplier: text("supplier"),
  isFoodGrade: boolean("is_food_grade").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  minOrderSheets: integer("min_order_sheets").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id),
});

/**
 * Seed with: offset_printing, digital_printing, plate, lamination_gloss,
 * lamination_matte, spot_uv, foil_stamp, emboss, die_cut, die_making,
 * stripping, gluing, manual_assembly, packing (SPEC §5).
 */
export const processRates = pgTable("process_rates", {
  ...baseColumns(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  unit: processRateUnitEnum("unit").notNull(),
  rateCentavos: centavos("rate_centavos").notNull(),
  setupFeeCentavos: centavos("setup_fee_centavos").notNull().default(0),
  /** Makeready/setup waste sheets for printing processes (SPEC §7 step 1). */
  setupSheets: integer("setup_sheets").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
});

export const boxSpecs = pgTable("box_specs", {
  ...baseColumns(),
  clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(),
  style: boxStyleEnum("style").notNull(),
  lengthMm: numeric("length_mm", { precision: 8, scale: 2 }).notNull(),
  widthMm: numeric("width_mm", { precision: 8, scale: 2 }).notNull(),
  heightMm: numeric("height_mm", { precision: 8, scale: 2 }).notNull(),
  materialId: uuid("material_id").references(() => materials.id),
  gsm: integer("gsm"),
  printColoursFront: integer("print_colours_front").notNull().default(0),
  printColoursBack: integer("print_colours_back").notNull().default(0),
  hasSpotColour: boolean("has_spot_colour").notNull().default(false),
  spotColourNotes: text("spot_colour_notes"),
  /** Array of process_rates.key strings, e.g. ["lamination_gloss", "spot_uv"]. */
  finishing: jsonb("finishing").notNull().default([]),
  isFoodGrade: boolean("is_food_grade").notNull().default(false),
  dielineAttachmentId: uuid("dieline_attachment_id").references(() => attachments.id),
  upsPerSheet: integer("ups_per_sheet").notNull().default(1),
  dieId: uuid("die_id").references((): AnyPgColumn => dies.id),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const dies = pgTable("dies", {
  ...baseColumns(),
  boxSpecId: uuid("box_spec_id")
    .notNull()
    .references(() => boxSpecs.id),
  storageCode: text("storage_code"),
  costCentavos: centavos("cost_centavos").notNull().default(0),
  createdDate: date("created_date", { mode: "string" }).notNull(),
  timesUsed: integer("times_used").notNull().default(0),
  condition: dieConditionEnum("condition").notNull().default("good"),
  createdBy: uuid("created_by").references(() => users.id),
});
