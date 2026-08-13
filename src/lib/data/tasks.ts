import "server-only";
import { desc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { tasks, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export async function listTasks(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        department: tasks.department,
        assigneeId: tasks.assigneeId,
        assigneeName: users.fullName,
        priority: tasks.priority,
        status: tasks.status,
        dueDate: tasks.dueDate,
        blockedReason: tasks.blockedReason,
        recurrenceRule: tasks.recurrenceRule,
        relatedEntityType: tasks.relatedEntityType,
        relatedEntityId: tasks.relatedEntityId,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(isNull(tasks.deletedAt))
      .orderBy(desc(tasks.createdAt))
  );
}
export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];
