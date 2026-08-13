import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { attendance, employees, holidays, leaveBalances, leaveRequests, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/**
 * Full row (not a trimmed projection) — the employee form reuses this
 * list for its edit-prefill, and a trimmed select would silently blank
 * out sssNo/philhealthNo/pagibigNo/tin/etc. on every edit (the form
 * would submit them as empty, overwriting real values with null).
 */
export async function listEmployees(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx.select().from(employees).where(isNull(employees.deletedAt)).orderBy(employees.fullName)
  );
}
export type EmployeeRow = Awaited<ReturnType<typeof listEmployees>>[number];

export async function getEmployeeForUser(user: CurrentUser) {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx.select().from(employees).where(eq(employees.userId, user.id)).limit(1);
    return row ?? null;
  });
}

export async function listAttendance(user: CurrentUser, employeeId?: string) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: employees.fullName,
        date: attendance.date,
        timeIn: attendance.timeIn,
        timeOut: attendance.timeOut,
        hoursWorked: attendance.hoursWorked,
        overtimeHours: attendance.overtimeHours,
        status: attendance.status,
      })
      .from(attendance)
      .leftJoin(employees, eq(employees.id, attendance.employeeId))
      .where(employeeId ? eq(attendance.employeeId, employeeId) : undefined)
      .orderBy(desc(attendance.date))
      .limit(200)
  );
}
export type AttendanceRow = Awaited<ReturnType<typeof listAttendance>>[number];

export async function listLeaveRequests(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        employeeName: employees.fullName,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        approvedByName: users.fullName,
        approvedAt: leaveRequests.approvedAt,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(employees.id, leaveRequests.employeeId))
      .leftJoin(users, eq(users.id, leaveRequests.approvedBy))
      .where(isNull(leaveRequests.deletedAt))
      .orderBy(desc(leaveRequests.createdAt))
  );
}
export type LeaveRequestRow = Awaited<ReturnType<typeof listLeaveRequests>>[number];

export async function listLeaveBalances(user: CurrentUser, employeeId?: string) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: leaveBalances.id,
        employeeId: leaveBalances.employeeId,
        employeeName: employees.fullName,
        year: leaveBalances.year,
        leaveType: leaveBalances.leaveType,
        entitledDays: leaveBalances.entitledDays,
        usedDays: leaveBalances.usedDays,
      })
      .from(leaveBalances)
      .leftJoin(employees, eq(employees.id, leaveBalances.employeeId))
      .where(employeeId ? eq(leaveBalances.employeeId, employeeId) : undefined)
      .orderBy(desc(leaveBalances.year))
  );
}
export type LeaveBalanceRow = Awaited<ReturnType<typeof listLeaveBalances>>[number];

export async function listHolidays(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx.select().from(holidays).where(isNull(holidays.deletedAt)).orderBy(holidays.date)
  );
}
export type HolidayRow = Awaited<ReturnType<typeof listHolidays>>[number];

export async function findEmployeeByNo(user: CurrentUser, employeeNo: string) {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.employeeNo, employeeNo), isNull(employees.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}
