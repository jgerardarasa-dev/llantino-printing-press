import { z } from "zod";

export const leaveFormSchema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  leaveType: z.enum(["vacation", "sick", "emergency", "maternity", "paternity", "unpaid", "solo_parent"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().max(1000).optional().or(z.literal("")),
});
export type LeaveFormValues = z.infer<typeof leaveFormSchema>;

/** Default annual entitlement per leave type when no leave_balances row exists yet — a placeholder until real HR policy is confirmed (SPEC §13 doesn't cover this explicitly, but it's the same class of "confirm with client" decision). */
export const DEFAULT_LEAVE_ENTITLEMENT_DAYS: Record<string, number> = {
  vacation: 15,
  sick: 15,
  emergency: 3,
  maternity: 105,
  paternity: 7,
  solo_parent: 7,
  unpaid: 0,
};
