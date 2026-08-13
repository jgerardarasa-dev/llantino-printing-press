"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { processRates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, PRICING_ADMIN_ROLES } from "@/lib/auth/permissions";
import { processRateFormSchema } from "@/lib/validation/forms/material-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveProcessRate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRICING_ADMIN_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = processRateFormSchema.safeParse({ ...raw, isActive: raw.isActive === "on" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    label: v.label,
    unit: v.unit,
    rateCentavos: Math.round(v.ratePesos * 100),
    setupFeeCentavos: Math.round(v.setupFeePesos * 100),
    setupSheets: v.setupSheets,
    isActive: v.isActive,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        // key is immutable after creation — it's referenced by
        // box_specs.finishing[] and by computeQuote's rate lookups.
        await tx.update(processRates).set({ ...values, updatedAt: new Date() }).where(eq(processRates.id, v.id!));
      } else {
        await tx.insert(processRates).values({ ...values, key: v.key, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveProcessRate failed", e);
    return { error: "Couldn't save the process rate. The key may already be in use." };
  }

  revalidatePath("/materials");
  return { success: true };
}

export async function softDeleteProcessRate(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRICING_ADMIN_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(processRates).set({ deletedAt: new Date() }).where(eq(processRates.id, id));
  });

  revalidatePath("/materials");
  return { success: true };
}
