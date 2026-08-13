"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { materials } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, PRICING_ADMIN_ROLES } from "@/lib/auth/permissions";
import { materialFormSchema } from "@/lib/validation/forms/material-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveMaterial(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRICING_ADMIN_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = materialFormSchema.safeParse({
    ...raw,
    isFoodGrade: raw.isFoodGrade === "on",
    isActive: raw.isActive === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    name: v.name,
    type: v.type,
    gsm: v.gsm,
    sheetWidthIn: v.sheetWidthIn.toFixed(2),
    sheetLengthIn: v.sheetLengthIn.toFixed(2),
    costPerSheetCentavos: Math.round(v.costPerSheetPesos * 100),
    supplier: v.supplier || null,
    isFoodGrade: v.isFoodGrade,
    isActive: v.isActive,
    minOrderSheets: v.minOrderSheets,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(materials).set({ ...values, updatedAt: new Date() }).where(eq(materials.id, v.id!));
      } else {
        await tx.insert(materials).values({ ...values, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveMaterial failed", e);
    return { error: "Couldn't save the material. Please try again." };
  }

  revalidatePath("/materials");
  return { success: true };
}

export async function softDeleteMaterial(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, PRICING_ADMIN_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(materials).set({ deletedAt: new Date() }).where(eq(materials.id, id));
  });

  revalidatePath("/materials");
  return { success: true };
}
