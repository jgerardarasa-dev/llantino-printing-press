"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { calendarEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { calendarEventFormSchema } from "@/lib/validation/forms/calendar-event-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveCalendarEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = calendarEventFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    title: v.title,
    description: v.description || null,
    eventType: v.eventType,
    department: v.department || null,
    startAt: new Date(v.startAt),
    endAt: v.endAt ? new Date(v.endAt) : null,
    allDay: v.allDay,
    location: v.location || null,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(calendarEvents).set({ ...values, updatedAt: new Date() }).where(eq(calendarEvents.id, v.id!));
      } else {
        await tx.insert(calendarEvents).values({ ...values, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveCalendarEvent failed", e);
    return { error: "Couldn't save the event." };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteCalendarEvent(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  await withUserContext(user.id, async (tx) => {
    await tx.update(calendarEvents).set({ deletedAt: new Date() }).where(eq(calendarEvents.id, id));
  });

  revalidatePath("/calendar");
  return { success: true };
}
