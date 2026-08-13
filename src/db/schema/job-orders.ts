import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { attachments, users } from "./core";
import { clients } from "./crm";
import { boxSpecs, materials } from "./product";
import { quotations } from "./quotation";
import { deliveryStatusEnum, jobOrderPriorityEnum, jobOrderStageEnum } from "./enums";

/**
 * The spine of the whole system (SPEC §6). Stage transitions are governed
 * by an explicit transition map in lib/job-orders/state-machine.ts and
 * enforced again by a Postgres trigger that writes jo_stage_history — the
 * trigger is the ground truth, application code cannot bypass it.
 */
export const jobOrders = pgTable("job_orders", {
  ...baseColumns(),
  joNumber: text("jo_number").notNull().unique(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  quotationId: uuid("quotation_id").references(() => quotations.id),
  clientPoNumber: text("client_po_number"),
  poAttachmentId: uuid("po_attachment_id").references(() => attachments.id),
  boxSpecId: uuid("box_spec_id").references(() => boxSpecs.id),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityProduced: integer("quantity_produced").notNull().default(0),
  quantityDelivered: integer("quantity_delivered").notNull().default(0),
  unitPriceCentavos: centavos("unit_price_centavos").notNull(),
  totalCentavos: centavos("total_centavos").notNull(),
  stage: jobOrderStageEnum("stage").notNull().default("draft"),
  priority: jobOrderPriorityEnum("priority").notNull().default("normal"),
  orderDate: date("order_date", { mode: "string" }).notNull(),
  targetDeliveryDate: date("target_delivery_date", { mode: "string" }),
  actualDeliveryDate: date("actual_delivery_date", { mode: "string" }),
  isRepeatOrder: boolean("is_repeat_order").notNull().default(false),
  previousJoId: uuid("previous_jo_id").references((): AnyPgColumn => jobOrders.id),
  salesOwnerId: uuid("sales_owner_id").references(() => users.id),
  productionOwnerId: uuid("production_owner_id").references(() => users.id),
  isOnHold: boolean("is_on_hold").notNull().default(false),
  holdReason: text("hold_reason"),
  cancelledReason: text("cancelled_reason"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

/**
 * Auto-inserted by a Postgres trigger on every stage change — never
 * written directly by application code. Powers the bottleneck analytics
 * (avg hours per stage over 90 days).
 */
export const joStageHistory = pgTable("jo_stage_history", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  fromStage: jobOrderStageEnum("from_stage"),
  toStage: jobOrderStageEnum("to_stage").notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  durationMinutes: integer("duration_minutes"),
  note: text("note"),
  isRework: boolean("is_rework").notNull().default(false),
});

export const joProductionLogs = pgTable("jo_production_logs", {
  ...baseColumns(),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  stage: jobOrderStageEnum("stage").notNull(),
  operatorId: uuid("operator_id").references(() => users.id),
  machine: text("machine"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  goodOutput: integer("good_output").notNull().default(0),
  wasteCount: integer("waste_count").notNull().default(0),
  wasteReason: text("waste_reason"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const joMaterials = pgTable("jo_materials", {
  ...baseColumns(),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  sheetsPlanned: integer("sheets_planned").notNull().default(0),
  sheetsIssued: integer("sheets_issued").notNull().default(0),
  sheetsUsed: integer("sheets_used").notNull().default(0),
  issuedBy: uuid("issued_by").references(() => users.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
});

/** e.g. QC checklist before packing (SPEC §6: quality_check → packing gate). */
export const joChecklists = pgTable("jo_checklists", {
  ...baseColumns(),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  stage: jobOrderStageEnum("stage").notNull(),
  itemLabel: text("item_label").notNull(),
  isDone: boolean("is_done").notNull().default(false),
  doneBy: uuid("done_by").references(() => users.id),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
});

export const deliveries = pgTable("deliveries", {
  ...baseColumns(),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  drNumber: text("dr_number").notNull().unique(),
  scheduledDate: date("scheduled_date", { mode: "string" }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  quantity: integer("quantity").notNull(),
  receivedByName: text("received_by_name"),
  driverName: text("driver_name"),
  vehicle: text("vehicle"),
  proofPhotoAttachmentId: uuid("proof_photo_attachment_id").references(() => attachments.id),
  status: deliveryStatusEnum("status").notNull().default("scheduled"),
  createdBy: uuid("created_by").references(() => users.id),
});
