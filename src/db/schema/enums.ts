import { pgEnum } from "drizzle-orm/pg-core";

// Keep in sync with src/lib/constants/roles.ts
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "management",
  "sales",
  "production",
  "accounting",
  "hr",
  "staff",
]);

export const attachmentKindEnum = pgEnum("attachment_kind", [
  "artwork",
  "dieline",
  "proof",
  "po",
  "receipt",
  "photo",
  "other",
]);

// --- CRM ---
export const clientPriceTierEnum = pgEnum("client_price_tier", [
  "standard",
  "preferred",
  "wholesale",
]);
export const clientSourceEnum = pgEnum("client_source", [
  "walk_in",
  "referral",
  "meta_ads",
  "website",
  "facebook",
  "other",
]);
export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "prospect",
  "active",
  "dormant",
  "lost",
]);
export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
]);
export const interactionTypeEnum = pgEnum("interaction_type", [
  "call",
  "email",
  "meeting",
  "site_visit",
  "messenger",
]);

// --- Product & pricing ---
export const materialTypeEnum = pgEnum("material_type", [
  "duplex_greyback",
  "duplex_whiteback",
  "c1s",
  "c2s",
  "sbs",
  "kraft",
  "corrugated_e",
]);
export const processRateUnitEnum = pgEnum("process_rate_unit", [
  "per_sheet",
  "per_piece",
  "per_plate",
  "per_job",
  "per_sqin",
]);
export const boxStyleEnum = pgEnum("box_style", [
  "straight_tuck",
  "reverse_tuck",
  "auto_lock_bottom",
  "snap_lock",
  "mailer",
  "pizza",
  "sleeve",
  "tray_lid",
  "custom",
]);
export const dieConditionEnum = pgEnum("die_condition", [
  "good",
  "worn",
  "needs_repair",
  "retired",
]);

// --- Quotation ---
export const quotationStatusEnum = pgEnum("quotation_status", [
  "draft",
  "pending_approval",
  "sent",
  "revised",
  "approved",
  "rejected",
  "expired",
]);

// --- Job Order state machine (SPEC §6) ---
export const jobOrderStageEnum = pgEnum("job_order_stage", [
  "draft",
  "for_artwork",
  "artwork_approval",
  "prepress",
  "materials_ready",
  "printing",
  "finishing",
  "die_cutting",
  "gluing_assembly",
  "quality_check",
  "packing",
  "ready_for_delivery",
  "delivered",
  "invoiced",
  "paid",
  "closed",
  "cancelled",
]);
export const jobOrderPriorityEnum = pgEnum("job_order_priority", [
  "normal",
  "rush",
  "critical",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "scheduled",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
]);

// --- Tasks & calendar ---
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
  "cancelled",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "normal", "high", "urgent"]);
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "delivery",
  "production_slot",
  "meeting",
  "deadline",
  "leave",
  "holiday",
  "maintenance",
  "payment_due",
  "other",
]);

// --- HR ---
export const employmentTypeEnum = pgEnum("employment_type", [
  "regular",
  "probationary",
  "contractual",
  "project",
]);
export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "resigned",
  "terminated",
  "awol",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "half_day",
  "leave",
  "holiday",
]);
export const leaveTypeEnum = pgEnum("leave_type", [
  "vacation",
  "sick",
  "emergency",
  "maternity",
  "paternity",
  "unpaid",
  "solo_parent",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const holidayTypeEnum = pgEnum("holiday_type", ["regular", "special_non_working"]);

// --- Accounting ---
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "check",
  "gcash",
  "maya",
  "other",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "materials",
  "utilities",
  "salaries",
  "rent",
  "maintenance",
  "transport",
  "marketing",
  "supplies",
  "other",
]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
]);
