"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { employees } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, HR_ROLES } from "@/lib/auth/permissions";
import { employeeFormSchema } from "@/lib/validation/forms/employee-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveEmployee(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = employeeFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const rateCentavos = Math.round(v.ratePesos * 100);

  const values = {
    employeeNo: v.employeeNo,
    fullName: v.fullName,
    position: v.position || null,
    department: v.department || null,
    employmentType: v.employmentType,
    dateHired: v.dateHired,
    dateRegularized: v.dateRegularized || null,
    dailyRateCentavos: v.rateType === "daily" ? rateCentavos : null,
    monthlyRateCentavos: v.rateType === "monthly" ? rateCentavos : null,
    sssNo: v.sssNo || null,
    philhealthNo: v.philhealthNo || null,
    pagibigNo: v.pagibigNo || null,
    tin: v.tin || null,
    emergencyContact: v.emergencyContact || null,
    status: v.status,
    userId: v.userId || null,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(employees).set({ ...values, updatedAt: new Date() }).where(eq(employees.id, v.id!));
      } else {
        await tx.insert(employees).values({ ...values, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveEmployee failed", e);
    return { error: "Couldn't save the employee. The employee number may already be in use." };
  }

  revalidatePath("/hr/employees");
  return { success: true };
}

export async function softDeleteEmployee(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id));
  });

  revalidatePath("/hr/employees");
  return { success: true };
}
