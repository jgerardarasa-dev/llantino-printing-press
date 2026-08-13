"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { joChecklists } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole } from "@/lib/auth/permissions";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import type { UserRole } from "@/lib/constants/roles";

export type ActionState = { error?: string; success?: boolean };

const PRODUCTION_ROLES: UserRole[] = ["admin", "management", "production"];

export async function toggleChecklistItem(id: string, jobOrderId: string, isDone: boolean): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRODUCTION_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx
      .update(joChecklists)
      .set({
        isDone,
        doneBy: isDone ? user.id : null,
        doneAt: isDone ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(joChecklists.id, id));
  });

  revalidatePath(`/job-orders/${jobOrderId}`);
  return { success: true };
}

export async function addChecklistItem(jobOrderId: string, stage: JobOrderStage, itemLabel: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRODUCTION_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (!itemLabel.trim()) return { error: "Item label is required." };

  await withUserContext(user.id, async (tx) => {
    await tx.insert(joChecklists).values({
      jobOrderId,
      stage,
      itemLabel: itemLabel.trim(),
      createdBy: user.id,
    });
  });

  revalidatePath(`/job-orders/${jobOrderId}`);
  return { success: true };
}
