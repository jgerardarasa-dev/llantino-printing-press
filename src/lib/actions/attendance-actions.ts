"use server";

import { revalidatePath } from "next/cache";

import { withUserContext } from "@/db/client";
import { attendance, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, HR_ROLES } from "@/lib/auth/permissions";
import { attendanceInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

function computeHours(timeIn: string | null, timeOut: string | null): string | null {
  if (!timeIn || !timeOut) return null;
  const [inH, inM] = timeIn.split(":").map(Number);
  const [outH, outM] = timeOut.split(":").map(Number);
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  if (minutes <= 0) return null;
  return (minutes / 60).toFixed(2);
}

export async function logAttendance(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const timeIn = (raw.timeIn as string) || null;
  const timeOut = (raw.timeOut as string) || null;

  const parsed = attendanceInsertSchema.safeParse({
    employeeId: raw.employeeId,
    date: raw.date,
    timeIn: timeIn || undefined,
    timeOut: timeOut || undefined,
    hoursWorked: computeHours(timeIn, timeOut) ?? undefined,
    overtimeHours: raw.overtimeHours || "0",
    status: raw.status || "present",
    notes: raw.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(attendance).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("logAttendance failed", e);
    return { error: "Couldn't save attendance. A record for that employee/date may already exist." };
  }

  revalidatePath("/hr/attendance");
  return { success: true };
}

const VALID_STATUSES = new Set(["present", "absent", "late", "half_day", "leave", "holiday"]);

/**
 * CSV import: employee_no,date,time_in,time_out,status
 * Header row required. time_in/time_out are HH:MM (24h), optional.
 */
export async function importAttendanceCsv(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file first." };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "The CSV has no data rows." };

  const [header, ...rows] = lines;
  const columns = header.split(",").map((c) => c.trim().toLowerCase());
  const expected = ["employee_no", "date", "time_in", "time_out", "status"];
  if (!expected.every((c) => columns.includes(c))) {
    return { error: `CSV header must include: ${expected.join(", ")}` };
  }

  let imported = 0;
  const errors: string[] = [];

  try {
    await withUserContext(user.id, async (tx) => {
      for (const [i, line] of rows.entries()) {
        const cells = line.split(",").map((c) => c.trim());
        const row = Object.fromEntries(columns.map((c, idx) => [c, cells[idx] ?? ""]));

        const [employee] = await tx
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.employeeNo, row.employee_no));
        if (!employee) {
          errors.push(`Row ${i + 2}: unknown employee_no "${row.employee_no}"`);
          continue;
        }

        const status = VALID_STATUSES.has(row.status) ? row.status : "present";
        const timeIn = row.time_in || null;
        const timeOut = row.time_out || null;

        try {
          await tx.insert(attendance).values({
            employeeId: employee.id,
            date: row.date,
            timeIn,
            timeOut,
            hoursWorked: computeHours(timeIn, timeOut),
            overtimeHours: "0",
            status: status as "present" | "absent" | "late" | "half_day" | "leave" | "holiday",
            createdBy: user.id,
          });
          imported++;
        } catch {
          errors.push(`Row ${i + 2}: couldn't import (duplicate date for this employee?)`);
        }
      }
    });
  } catch (e) {
    console.error("importAttendanceCsv failed", e);
    return { error: "Import failed. Please try again." };
  }

  revalidatePath("/hr/attendance");
  if (errors.length > 0) {
    return { error: `Imported ${imported} rows. ${errors.length} failed: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "…" : ""}` };
  }
  return { success: true };
}
