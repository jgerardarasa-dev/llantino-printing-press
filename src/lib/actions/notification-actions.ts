"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export type ActionState = { error?: string; success?: boolean };

export async function markNotificationRead(notificationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  await withUserContext(user.id, async (tx) => {
    // RLS (`notifications_update_own`) already scopes this to the
    // caller's own row; the userId filter here is belt-and-suspenders.
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
  });

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  await withUserContext(user.id, async (tx) => {
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  });

  revalidatePath("/notifications");
  return { success: true };
}
