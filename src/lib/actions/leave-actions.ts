"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { employees, leaveBalances, leaveRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, LEAVE_APPROVER_ROLES } from "@/lib/auth/permissions";
import { findUserIdForEmployee, notify, notifyRoles } from "@/lib/notifications/create";
import { DEFAULT_LEAVE_ENTITLEMENT_DAYS, leaveFormSchema } from "@/lib/validation/forms/leave-form";

export type ActionState = { error?: string; success?: boolean };

function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

export async function fileLeaveRequest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = leaveFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  if (v.endDate < v.startDate) {
    return { error: "End date can't be before the start date." };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      // Non-HR/approver users may only file for their own linked employee
      // record — RLS enforces this too, but check here for a clean error.
      if (!LEAVE_APPROVER_ROLES.includes(user.role)) {
        const [own] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
        if (!own || own.id !== v.employeeId) {
          throw new Error("You can only file leave for yourself.");
        }
      }

      const [employeeRow] = await tx.select({ fullName: employees.fullName }).from(employees).where(eq(employees.id, v.employeeId)).limit(1);

      await tx.insert(leaveRequests).values({
        employeeId: v.employeeId,
        leaveType: v.leaveType,
        startDate: v.startDate,
        endDate: v.endDate,
        days: String(countDaysInclusive(v.startDate, v.endDate)),
        reason: v.reason || null,
        status: "pending",
        createdBy: user.id,
      });

      await notifyRoles(tx, LEAVE_APPROVER_ROLES, {
        type: "leave_submitted",
        title: `Leave request: ${employeeRow?.fullName ?? "An employee"}`,
        body: `${v.leaveType.replace("_", " ")}, ${v.startDate} – ${v.endDate}`,
        linkUrl: "/hr/leave",
      });
    });
  } catch (e) {
    console.error("fileLeaveRequest failed", e);
    return { error: e instanceof Error ? e.message : "Couldn't file the leave request." };
  }

  revalidatePath("/hr/leave");
  revalidatePath("/calendar");
  return { success: true };
}

export async function approveLeaveRequest(leaveRequestId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, LEAVE_APPROVER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      const [request] = await tx.select().from(leaveRequests).where(eq(leaveRequests.id, leaveRequestId)).limit(1);
      if (!request) throw new Error("Leave request not found.");
      if (request.status !== "pending") throw new Error("Only a pending request can be approved.");

      await tx
        .update(leaveRequests)
        .set({ status: "approved", approvedBy: user.id, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(leaveRequests.id, leaveRequestId));

      const year = new Date(request.startDate).getFullYear();
      const [balance] = await tx
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, request.employeeId),
            eq(leaveBalances.year, year),
            eq(leaveBalances.leaveType, request.leaveType)
          )
        )
        .limit(1);

      const requestedDays = Number(request.days);
      if (balance) {
        await tx
          .update(leaveBalances)
          .set({ usedDays: String(Number(balance.usedDays) + requestedDays), updatedAt: new Date() })
          .where(eq(leaveBalances.id, balance.id));
      } else {
        await tx.insert(leaveBalances).values({
          employeeId: request.employeeId,
          year,
          leaveType: request.leaveType,
          entitledDays: String(DEFAULT_LEAVE_ENTITLEMENT_DAYS[request.leaveType] ?? 0),
          usedDays: String(requestedDays),
          createdBy: user.id,
        });
      }

      const employeeUserId = await findUserIdForEmployee(tx, request.employeeId);
      await notify(tx, {
        userId: employeeUserId,
        type: "leave_decided",
        title: "Leave request approved",
        body: `${request.startDate} – ${request.endDate}`,
        linkUrl: "/hr/leave",
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't approve the leave request." };
  }

  revalidatePath("/hr/leave");
  revalidatePath("/calendar");
  return { success: true };
}

export async function rejectLeaveRequest(leaveRequestId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, LEAVE_APPROVER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    const [request] = await tx.select().from(leaveRequests).where(eq(leaveRequests.id, leaveRequestId)).limit(1);

    await tx
      .update(leaveRequests)
      .set({ status: "rejected", approvedBy: user.id, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(leaveRequests.id, leaveRequestId));

    if (request) {
      const employeeUserId = await findUserIdForEmployee(tx, request.employeeId);
      await notify(tx, {
        userId: employeeUserId,
        type: "leave_decided",
        title: "Leave request rejected",
        body: `${request.startDate} – ${request.endDate}`,
        linkUrl: "/hr/leave",
      });
    }
  });

  revalidatePath("/hr/leave");
  return { success: true };
}

export async function cancelLeaveRequest(leaveRequestId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  await withUserContext(user.id, async (tx) => {
    const [request] = await tx.select().from(leaveRequests).where(eq(leaveRequests.id, leaveRequestId)).limit(1);
    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("Only a pending request can be cancelled.");
    await tx.update(leaveRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(leaveRequests.id, leaveRequestId));
  });

  revalidatePath("/hr/leave");
  return { success: true };
}
