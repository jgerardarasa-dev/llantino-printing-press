import "server-only";
import { eq, inArray } from "drizzle-orm";

import { employees, notifications, users } from "@/db/schema";
import type { withUserContext } from "@/db/client";
import type { UserRole } from "@/lib/constants/roles";

type Tx = Parameters<Parameters<typeof withUserContext>[1]>[0];

/**
 * SPEC §10 "notifications (in-app + email digest)". A fixed, documented
 * set of events writes a row here — not every mutation in the app, just
 * the ones where a *different* person than the actor needs to know
 * something happened. Always called with the same `tx` the triggering
 * Server Action is already inside, so the notification either commits
 * with the state change or not at all. The `notifications_insert` RLS
 * policy is `with check (true)` specifically so any authenticated user
 * can notify any other user (e.g. sales assigning a lead notifies
 * whoever it's assigned to, not just themselves).
 */
export type NotificationType =
  | "lead_assigned"
  | "quotation_pending_approval"
  | "quotation_decided"
  | "job_order_hold"
  | "job_order_cancelled"
  | "leave_submitted"
  | "leave_decided"
  | "task_assigned";

export async function notify(
  tx: Tx,
  params: { userId: string | null | undefined; type: NotificationType; title: string; body?: string; linkUrl?: string }
): Promise<void> {
  if (!params.userId) return;
  await tx.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    linkUrl: params.linkUrl ?? null,
  });
}

export async function notifyMany(
  tx: Tx,
  userIds: (string | null | undefined)[],
  params: { type: NotificationType; title: string; body?: string; linkUrl?: string }
): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return;
  await tx.insert(notifications).values(
    ids.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      linkUrl: params.linkUrl ?? null,
    }))
  );
}

/** Notifies every active user holding one of `roles` — e.g. all admin/management for a quote pending approval. */
export async function notifyRoles(
  tx: Tx,
  roles: UserRole[],
  params: { type: NotificationType; title: string; body?: string; linkUrl?: string }
): Promise<void> {
  const recipients = await tx
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, roles));
  await notifyMany(tx, recipients.map((r) => r.id), params);
}

/** Looks up the auth user linked to an `employees` row (leave notifications key off employeeId, not userId). */
export async function findUserIdForEmployee(tx: Tx, employeeId: string): Promise<string | null> {
  const [row] = await tx.select({ userId: employees.userId }).from(employees).where(eq(employees.id, employeeId)).limit(1);
  return row?.userId ?? null;
}
