"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { boxSpecs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, BOX_SPEC_ROLES } from "@/lib/auth/permissions";
import { boxSpecFormSchema } from "@/lib/validation/forms/material-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveBoxSpec(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, BOX_SPEC_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = boxSpecFormSchema.safeParse({
    ...raw,
    hasSpotColour: raw.hasSpotColour === "on",
    isFoodGrade: raw.isFoodGrade === "on",
    finishing: formData.getAll("finishing"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    name: v.name,
    style: v.style,
    lengthMm: v.lengthMm.toFixed(2),
    widthMm: v.widthMm.toFixed(2),
    heightMm: v.heightMm.toFixed(2),
    materialId: v.materialId,
    printColoursFront: v.printColoursFront,
    printColoursBack: v.printColoursBack,
    hasSpotColour: v.hasSpotColour,
    spotColourNotes: v.spotColourNotes || null,
    finishing: v.finishing,
    isFoodGrade: v.isFoodGrade,
    upsPerSheet: v.upsPerSheet,
    notes: v.notes || null,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(boxSpecs).set({ ...values, updatedAt: new Date() }).where(eq(boxSpecs.id, v.id!));
      } else {
        await tx.insert(boxSpecs).values({ ...values, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveBoxSpec failed", e);
    return { error: "Couldn't save the box spec. Please try again." };
  }

  revalidatePath("/materials");
  return { success: true };
}

export async function softDeleteBoxSpec(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, BOX_SPEC_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(boxSpecs).set({ deletedAt: new Date() }).where(eq(boxSpecs.id, id));
  });

  revalidatePath("/materials");
  return { success: true };
}
