import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

import * as schema from "@/db/schema";

/**
 * One Zod schema per entity, derived straight from the Drizzle table
 * definitions so the DB schema and validation can never drift apart.
 * Server Actions import the `*Insert`/`*Update` schema for the entity
 * they're mutating and re-validate with it server-side — never trust
 * client-side react-hook-form validation alone (SPEC hard rule).
 *
 * Naming convention: `<entity>Insert`, `<entity>Update`, `<entity>Row`
 * (select/read shape).
 */

// --- Core / org ---
export const userInsertSchema = createInsertSchema(schema.users);
export const userUpdateSchema = createUpdateSchema(schema.users);
export const userRowSchema = createSelectSchema(schema.users);

export const departmentInsertSchema = createInsertSchema(schema.departments);
export const departmentUpdateSchema = createUpdateSchema(schema.departments);
export const departmentRowSchema = createSelectSchema(schema.departments);

export const settingsRowSchema = createSelectSchema(schema.settings);

export const activityLogRowSchema = createSelectSchema(schema.activityLog);

export const notificationInsertSchema = createInsertSchema(schema.notifications);
export const notificationRowSchema = createSelectSchema(schema.notifications);

export const attachmentInsertSchema = createInsertSchema(schema.attachments);
export const attachmentRowSchema = createSelectSchema(schema.attachments);

export const commentInsertSchema = createInsertSchema(schema.comments);
export const commentUpdateSchema = createUpdateSchema(schema.comments);
export const commentRowSchema = createSelectSchema(schema.comments);

// --- CRM ---
export const clientInsertSchema = createInsertSchema(schema.clients, {
  companyName: (s) => s.min(1, "Company name is required"),
  paymentTermsDays: (s) => s.int().min(0).max(365),
  creditLimitCentavos: (s) => s.int().min(0),
});
export const clientUpdateSchema = createUpdateSchema(schema.clients);
export const clientRowSchema = createSelectSchema(schema.clients);

export const contactInsertSchema = createInsertSchema(schema.contacts, {
  name: (s) => s.min(1, "Contact name is required"),
  email: (s) => s.email().optional(),
});
export const contactUpdateSchema = createUpdateSchema(schema.contacts);
export const contactRowSchema = createSelectSchema(schema.contacts);

export const leadInsertSchema = createInsertSchema(schema.leads, {
  name: (s) => s.min(1, "Lead name is required"),
});
export const leadUpdateSchema = createUpdateSchema(schema.leads);
export const leadRowSchema = createSelectSchema(schema.leads);

export const interactionInsertSchema = createInsertSchema(schema.interactions, {
  summary: (s) => s.min(1, "Summary is required"),
});
export const interactionRowSchema = createSelectSchema(schema.interactions);

// --- Product & pricing ---
export const materialInsertSchema = createInsertSchema(schema.materials, {
  name: (s) => s.min(1),
  gsm: (s) => s.int().positive(),
  costPerSheetCentavos: (s) => s.int().positive(),
});
export const materialUpdateSchema = createUpdateSchema(schema.materials);
export const materialRowSchema = createSelectSchema(schema.materials);

export const processRateInsertSchema = createInsertSchema(schema.processRates, {
  key: (s) => s.min(1),
  label: (s) => s.min(1),
  rateCentavos: (s) => s.int().nonnegative(),
  setupFeeCentavos: (s) => s.int().nonnegative(),
  setupSheets: (s) => s.int().nonnegative(),
});
export const processRateUpdateSchema = createUpdateSchema(schema.processRates);
export const processRateRowSchema = createSelectSchema(schema.processRates);

export const boxSpecInsertSchema = createInsertSchema(schema.boxSpecs, {
  name: (s) => s.min(1),
  upsPerSheet: (s) => s.int().positive(),
  printColoursFront: (s) => s.int().nonnegative(),
  printColoursBack: (s) => s.int().nonnegative(),
});
export const boxSpecUpdateSchema = createUpdateSchema(schema.boxSpecs);
export const boxSpecRowSchema = createSelectSchema(schema.boxSpecs);

export const dieInsertSchema = createInsertSchema(schema.dies);
export const dieRowSchema = createSelectSchema(schema.dies);

// --- Quotation ---
export const quotationInsertSchema = createInsertSchema(schema.quotations, {
  quoteNumber: (s) => s.min(1),
  markupPct: (s) => s.int().min(0).max(10000),
});
export const quotationUpdateSchema = createUpdateSchema(schema.quotations);
export const quotationRowSchema = createSelectSchema(schema.quotations);

export const quotationItemInsertSchema = createInsertSchema(schema.quotationItems, {
  description: (s) => s.min(1),
  quantity: (s) => s.int().positive(),
  unitPriceCentavos: (s) => s.int().nonnegative(),
  lineTotalCentavos: (s) => s.int().nonnegative(),
});
export const quotationItemRowSchema = createSelectSchema(schema.quotationItems);

export const quotationTierInsertSchema = createInsertSchema(schema.quotationTiers, {
  quantity: (s) => s.int().positive(),
  unitPriceCentavos: (s) => s.int().nonnegative(),
});
export const quotationTierRowSchema = createSelectSchema(schema.quotationTiers);

// --- Job Order spine ---
export const jobOrderInsertSchema = createInsertSchema(schema.jobOrders, {
  joNumber: (s) => s.min(1),
  quantityOrdered: (s) => s.int().positive(),
  quantityProduced: (s) => s.int().nonnegative(),
  quantityDelivered: (s) => s.int().nonnegative(),
  unitPriceCentavos: (s) => s.int().nonnegative(),
  totalCentavos: (s) => s.int().nonnegative(),
});
export const jobOrderUpdateSchema = createUpdateSchema(schema.jobOrders);
export const jobOrderRowSchema = createSelectSchema(schema.jobOrders);

export const joStageHistoryRowSchema = createSelectSchema(schema.joStageHistory);

export const joProductionLogInsertSchema = createInsertSchema(schema.joProductionLogs, {
  goodOutput: (s) => s.int().nonnegative(),
  wasteCount: (s) => s.int().nonnegative(),
});
export const joProductionLogRowSchema = createSelectSchema(schema.joProductionLogs);

export const joMaterialInsertSchema = createInsertSchema(schema.joMaterials, {
  sheetsPlanned: (s) => s.int().nonnegative(),
  sheetsIssued: (s) => s.int().nonnegative(),
  sheetsUsed: (s) => s.int().nonnegative(),
});
export const joMaterialRowSchema = createSelectSchema(schema.joMaterials);

export const joChecklistInsertSchema = createInsertSchema(schema.joChecklists, {
  itemLabel: (s) => s.min(1),
});
export const joChecklistUpdateSchema = createUpdateSchema(schema.joChecklists);
export const joChecklistRowSchema = createSelectSchema(schema.joChecklists);

export const deliveryInsertSchema = createInsertSchema(schema.deliveries, {
  drNumber: (s) => s.min(1),
  quantity: (s) => s.int().positive(),
});
export const deliveryUpdateSchema = createUpdateSchema(schema.deliveries);
export const deliveryRowSchema = createSelectSchema(schema.deliveries);

// --- Tasks & calendar ---
export const taskInsertSchema = createInsertSchema(schema.tasks, {
  title: (s) => s.min(1),
});
export const taskUpdateSchema = createUpdateSchema(schema.tasks);
export const taskRowSchema = createSelectSchema(schema.tasks);

export const calendarEventInsertSchema = createInsertSchema(schema.calendarEvents, {
  title: (s) => s.min(1),
});
export const calendarEventUpdateSchema = createUpdateSchema(schema.calendarEvents);
export const calendarEventRowSchema = createSelectSchema(schema.calendarEvents);

// --- HR ---
export const employeeInsertSchema = createInsertSchema(schema.employees, {
  employeeNo: (s) => s.min(1),
  fullName: (s) => s.min(1),
});
export const employeeUpdateSchema = createUpdateSchema(schema.employees);
export const employeeRowSchema = createSelectSchema(schema.employees);

export const attendanceInsertSchema = createInsertSchema(schema.attendance);
export const attendanceUpdateSchema = createUpdateSchema(schema.attendance);
export const attendanceRowSchema = createSelectSchema(schema.attendance);

export const leaveRequestInsertSchema = createInsertSchema(schema.leaveRequests, {
  days: (s) => s.regex(/^\d+(\.\d{1,2})?$/, "Invalid day count"),
});
export const leaveRequestUpdateSchema = createUpdateSchema(schema.leaveRequests);
export const leaveRequestRowSchema = createSelectSchema(schema.leaveRequests);

export const leaveBalanceInsertSchema = createInsertSchema(schema.leaveBalances);
export const leaveBalanceRowSchema = createSelectSchema(schema.leaveBalances);

export const holidayInsertSchema = createInsertSchema(schema.holidays, {
  name: (s) => s.min(1),
});
export const holidayRowSchema = createSelectSchema(schema.holidays);

// --- Accounting ---
export const invoiceInsertSchema = createInsertSchema(schema.invoices, {
  invoiceNumber: (s) => s.min(1),
  subtotalCentavos: (s) => s.int().nonnegative(),
  totalCentavos: (s) => s.int().nonnegative(),
});
export const invoiceUpdateSchema = createUpdateSchema(schema.invoices);
export const invoiceRowSchema = createSelectSchema(schema.invoices);

export const paymentInsertSchema = createInsertSchema(schema.payments, {
  amountCentavos: (s) => s.int().positive(),
});
export const paymentRowSchema = createSelectSchema(schema.payments);

export const expenseInsertSchema = createInsertSchema(schema.expenses, {
  description: (s) => s.min(1),
  amountCentavos: (s) => s.int().positive(),
});
export const expenseUpdateSchema = createUpdateSchema(schema.expenses);
export const expenseRowSchema = createSelectSchema(schema.expenses);

export const purchaseOrderInsertSchema = createInsertSchema(schema.purchaseOrders, {
  supplier: (s) => s.min(1),
  poNumber: (s) => s.min(1),
});
export const purchaseOrderUpdateSchema = createUpdateSchema(schema.purchaseOrders);
export const purchaseOrderRowSchema = createSelectSchema(schema.purchaseOrders);

// --- Marketing ---
export const adSpendInsertSchema = createInsertSchema(schema.adSpend, {
  spendCentavos: (s) => s.int().nonnegative(),
  leadsGenerated: (s) => s.int().nonnegative(),
});
export const adSpendRowSchema = createSelectSchema(schema.adSpend);
