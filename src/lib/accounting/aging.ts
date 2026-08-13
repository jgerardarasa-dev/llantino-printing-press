/**
 * Pure aging-bucket logic — deliberately has no "server-only" import (no
 * DB access) so it can be shared between server data-fetchers and
 * client components (e.g. the invoices DataTable's status column, which
 * needs to compute "overdue" without pulling the whole server-only
 * lib/data/accounting.ts module into the client bundle).
 */
export const AGING_BUCKETS = ["current", "0-30", "31-60", "61-90", "90+"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export function bucketForDueDate(dueDate: string, asOf = new Date()): AgingBucket {
  const daysOverdue = Math.floor((asOf.getTime() - new Date(dueDate).getTime()) / 86_400_000);
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}
