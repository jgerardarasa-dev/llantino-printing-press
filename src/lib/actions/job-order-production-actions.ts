"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { joMaterials, joProductionLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/constants/roles";
import { joProductionLogInsertSchema, joMaterialInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

const PRODUCTION_ROLES: UserRole[] = ["admin", "management", "production"];

export async function logProduction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRODUCTION_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = joProductionLogInsertSchema.safeParse({
    jobOrderId: raw.jobOrderId,
    stage: raw.stage,
    operatorId: user.id,
    machine: raw.machine || undefined,
    startedAt: raw.startedAt ? new Date(raw.startedAt as string) : undefined,
    endedAt: raw.endedAt ? new Date(raw.endedAt as string) : undefined,
    goodOutput: raw.goodOutput || 0,
    wasteCount: raw.wasteCount || 0,
    wasteReason: raw.wasteReason || undefined,
    notes: raw.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(joProductionLogs).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("logProduction failed", e);
    return { error: "Couldn't save the production log." };
  }

  revalidatePath(`/job-orders/${raw.jobOrderId}`);
  return { success: true };
}

export async function issueMaterial(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRODUCTION_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = joMaterialInsertSchema.safeParse({
    jobOrderId: raw.jobOrderId,
    materialId: raw.materialId,
    sheetsPlanned: raw.sheetsPlanned || 0,
    sheetsIssued: raw.sheetsIssued || 0,
    sheetsUsed: raw.sheetsUsed || 0,
    issuedBy: user.id,
    issuedAt: new Date(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(joMaterials).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("issueMaterial failed", e);
    return { error: "Couldn't record the material issuance." };
  }

  revalidatePath(`/job-orders/${raw.jobOrderId}`);
  return { success: true };
}

export async function updateMaterialUsage(id: string, jobOrderId: string, sheetsUsed: number): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRODUCTION_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(joMaterials).set({ sheetsUsed, updatedAt: new Date() }).where(eq(joMaterials.id, id));
  });

  revalidatePath(`/job-orders/${jobOrderId}`);
  return { success: true };
}
