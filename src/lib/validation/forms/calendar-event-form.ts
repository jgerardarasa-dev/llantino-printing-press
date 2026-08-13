import { z } from "zod";

export const calendarEventFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(2000).optional().or(z.literal("")),
  eventType: z
    .enum(["delivery", "production_slot", "meeting", "deadline", "leave", "holiday", "maintenance", "payment_due", "other"])
    .default("meeting"),
  department: z.string().max(120).optional().or(z.literal("")),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().optional().or(z.literal("")),
  allDay: z.coerce.boolean().default(false),
  location: z.string().max(300).optional().or(z.literal("")),
});
export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;
