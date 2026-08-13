import { date, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { attachments, users } from "./core";
import { clients } from "./crm";
import { jobOrders } from "./job-orders";
import { expenseCategoryEnum, invoiceStatusEnum, paymentMethodEnum, purchaseOrderStatusEnum } from "./enums";

export const invoices = pgTable("invoices", {
  ...baseColumns(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  jobOrderId: uuid("job_order_id")
    .notNull()
    .references(() => jobOrders.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  invoiceDate: date("invoice_date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  subtotalCentavos: centavos("subtotal_centavos").notNull(),
  vatCentavos: centavos("vat_centavos").notNull().default(0),
  withholdingTaxCentavos: centavos("withholding_tax_centavos").notNull().default(0),
  totalCentavos: centavos("total_centavos").notNull(),
  amountPaidCentavos: centavos("amount_paid_centavos").notNull().default(0),
  balanceCentavos: centavos("balance_centavos").notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const payments = pgTable("payments", {
  ...baseColumns(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  amountCentavos: centavos("amount_centavos").notNull(),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  referenceNo: text("reference_no"),
  checkDate: date("check_date", { mode: "string" }),
  receivedBy: uuid("received_by").references(() => users.id),
  attachmentId: uuid("attachment_id").references(() => attachments.id),
  createdBy: uuid("created_by").references(() => users.id),
});

export const expenses = pgTable("expenses", {
  ...baseColumns(),
  category: expenseCategoryEnum("category").notNull(),
  vendor: text("vendor"),
  description: text("description").notNull(),
  amountCentavos: centavos("amount_centavos").notNull(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  /** Nullable — for job costing when tagged to a specific JO. */
  jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  receiptAttachmentId: uuid("receipt_attachment_id").references(() => attachments.id),
  recordedBy: uuid("recorded_by")
    .notNull()
    .references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
});

export const purchaseOrders = pgTable("purchase_orders", {
  ...baseColumns(),
  supplier: text("supplier").notNull(),
  poNumber: text("po_number").notNull().unique(),
  items: jsonb("items").notNull().default([]),
  totalCentavos: centavos("total_centavos").notNull().default(0),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  expectedDate: date("expected_date", { mode: "string" }),
  receivedDate: date("received_date", { mode: "string" }),
  jobOrderId: uuid("job_order_id").references(() => jobOrders.id),
  createdBy: uuid("created_by").references(() => users.id),
});
