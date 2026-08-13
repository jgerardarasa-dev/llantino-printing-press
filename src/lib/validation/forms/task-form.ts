import { z } from "zod";

export const RECURRENCE_PRESETS = ["none", "daily", "weekly", "monthly"] as const;
export type RecurrencePreset = (typeof RECURRENCE_PRESETS)[number];

/**
 * `tasks.recurrence_rule` is a free-text column meant for an iCal RRULE
 * string. Parsing/generating real RRULEs is out of scope for the MVP —
 * we store one of a few simple presets instead ("daily"/"weekly"/
 * "monthly") and advance the due date by a fixed offset when a
 * recurring task is completed. Good enough for "clean the press every
 * Monday", not a general-purpose scheduler.
 */
export const taskFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(4000).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueDate: z.string().optional().or(z.literal("")),
  recurrenceRule: z.enum(RECURRENCE_PRESETS).default("none"),
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;
