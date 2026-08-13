/**
 * The 6 layers v_calendar_feed unions together (SPEC §5 calendar rule).
 * One source of truth for label + colour, used by both the layer-toggle
 * checkboxes and the events rendered on the calendar.
 */
export const CALENDAR_SOURCES = [
  "manual",
  "job_order_target",
  "task",
  "leave",
  "holiday",
  "invoice_due",
] as const;
export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

export const SOURCE_META: Record<CalendarSource, { label: string; color: string }> = {
  manual: { label: "Manual events", color: "#8b5cf6" },
  job_order_target: { label: "JO delivery targets", color: "#3b82f6" },
  task: { label: "Task due dates", color: "#f59e0b" },
  leave: { label: "Approved leave", color: "#14b8a6" },
  holiday: { label: "PH holidays", color: "#f43f5e" },
  invoice_due: { label: "Invoice due dates", color: "#d946ef" },
};
