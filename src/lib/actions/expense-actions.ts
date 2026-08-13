"use server";

import { revalidatePath } from "next/cache";

import { withUserContext } from "@/db/client";
import { expenses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ACCOUNTING_WRITE_ROLES, assertRole } from "@/lib/auth/permissions";
import { expenseInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

export async function saveExpense(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, ACCOUNTING_WRITE_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseInsertSchema.safeParse({
    category: raw.category,
    vendor: raw.vendor || undefined,
    description: raw.description,
    amountCentavos: Math.round(Number(raw.amountPesos || 0) * 100),
    expenseDate: raw.expenseDate,
    jobOrderId: raw.jobOrderId || undefined,
    paymentMethod: raw.paymentMethod || "cash",
    recordedBy: user.id,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(expenses).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("saveExpense failed", e);
    return { error: "Couldn't save the expense." };
  }

  revalidatePath("/accounting/expenses");
  return { success: true };
}
