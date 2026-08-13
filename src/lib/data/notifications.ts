import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { notifications } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/** RLS (`notifications_select_own`) already scopes this to the caller's own rows (or admin) — this just adds the ordering/limit. */
export async function listNotifications(user: CurrentUser, limit = 30) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  );
}
export type NotificationRow = Awaited<ReturnType<typeof listNotifications>>[number];

export async function getUnreadNotificationCount(user: CurrentUser): Promise<number> {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    return row?.count ?? 0;
  });
}
