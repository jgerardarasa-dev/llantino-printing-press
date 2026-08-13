"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { holidays } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, HR_ROLES } from "@/lib/auth/permissions";

export type ActionState = { error?: string; success?: boolean };

export async function addHoliday(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const date = formData.get("date") as string;
  const name = formData.get("name") as string;
  const type = (formData.get("type") as string) || "regular";
  if (!date || !name?.trim()) return { error: "Date and name are required." };

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(holidays).values({
        date,
        name: name.trim(),
        type: type as "regular" | "special_non_working",
        createdBy: user.id,
      });
    });
  } catch (e) {
    console.error("addHoliday failed", e);
    return { error: "Couldn't add the holiday." };
  }

  revalidatePath("/hr/leave");
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteHoliday(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, HR_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(holidays).set({ deletedAt: new Date() }).where(eq(holidays.id, id));
  });

  revalidatePath("/hr/leave");
  revalidatePath("/calendar");
  return { success: true };
}
