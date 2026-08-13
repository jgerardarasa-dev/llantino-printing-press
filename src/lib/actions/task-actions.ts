"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { taskFormSchema, type RecurrencePreset } from "@/lib/validation/forms/task-form";

export type ActionState = { error?: string; success?: boolean };

export async function saveTask(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = taskFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    title: v.title,
    description: v.description || null,
    department: v.department || null,
    assigneeId: v.assigneeId || null,
    priority: v.priority,
    dueDate: v.dueDate ? new Date(v.dueDate) : null,
    recurrenceRule: v.recurrenceRule === "none" ? null : v.recurrenceRule,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(tasks).set({ ...values, updatedAt: new Date() }).where(eq(tasks.id, v.id!));
      } else {
        await tx.insert(tasks).values({ ...values, status: "todo", createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveTask failed", e);
    return { error: "Couldn't save the task." };
  }

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  return { success: true };
}

function advanceDueDate(dueDate: Date, preset: RecurrencePreset): Date {
  const next = new Date(dueDate);
  if (preset === "daily") next.setDate(next.getDate() + 1);
  else if (preset === "weekly") next.setDate(next.getDate() + 7);
  else if (preset === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

export async function updateTaskStatus(taskId: string, status: string, blockedReason?: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  try {
    await withUserContext(user.id, async (tx) => {
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) throw new Error("Task not found.");

      await tx
        .update(tasks)
        .set({
          status: status as "todo" | "in_progress" | "blocked" | "review" | "done" | "cancelled",
          blockedReason: status === "blocked" ? blockedReason ?? null : null,
          completedAt: status === "done" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      // Recurring task: spawn the next occurrence on completion.
      if (status === "done" && task.recurrenceRule) {
        const preset = task.recurrenceRule as RecurrencePreset;
        const baseline = task.dueDate ?? new Date();
        await tx.insert(tasks).values({
          title: task.title,
          description: task.description,
          department: task.department,
          assigneeId: task.assigneeId,
          watchers: task.watchers,
          priority: task.priority,
          status: "todo",
          dueDate: advanceDueDate(baseline, preset),
          recurrenceRule: task.recurrenceRule,
          checklist: task.checklist,
          createdBy: user.id,
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't update the task." };
  }

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  await withUserContext(user.id, async (tx) => {
    await tx.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, taskId));
  });

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  return { success: true };
}
