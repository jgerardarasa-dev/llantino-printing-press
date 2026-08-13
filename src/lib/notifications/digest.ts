import "server-only";
import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { invoices, jobOrders, leaveRequests, notifications, users } from "@/db/schema";
import type { UserRole } from "@/lib/constants/roles";
import { formatCentavos } from "@/lib/format";

/**
 * SPEC §10: "notifications (in-app + email digest)". This runs outside
 * any signed-in request (an external scheduler hits the route below), so
 * there's no `CurrentUser` to drive `withUserContext` — it queries the
 * plain `db` export directly, the same "trusted server-only path" used
 * by the seed scripts and the invite-user flow (see
 * src/lib/supabase/admin.ts's doc comment). Nothing here is user input.
 */

type DigestRecipient = { id: string; fullName: string; email: string; role: UserRole };

async function getDigestRecipients(): Promise<DigestRecipient[]> {
  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.isActive, true));
}

type DigestContent = {
  unreadNotifications: { title: string; body: string | null }[];
  overdueInvoicesCount: number;
  overdueInvoicesCentavos: number;
  atRiskJobOrdersCount: number;
  pendingLeaveCount: number;
};

const MANAGEMENT_ISH: UserRole[] = ["admin", "management"];

async function buildDigestContent(recipient: DigestRecipient): Promise<DigestContent> {
  const unread = await db
    .select({ title: notifications.title, body: notifications.body })
    .from(notifications)
    .where(and(eq(notifications.userId, recipient.id), isNull(notifications.readAt)))
    .limit(20);

  const canSeeMoney = MANAGEMENT_ISH.includes(recipient.role) || recipient.role === "accounting";
  const canSeeProduction = MANAGEMENT_ISH.includes(recipient.role) || recipient.role === "production";
  const canSeeHr = MANAGEMENT_ISH.includes(recipient.role) || recipient.role === "hr";

  const [overdueRow] = canSeeMoney
    ? await db
        .select({ n: sql<string>`count(*)`, total: sql<string>`coalesce(sum(${invoices.balanceCentavos}), 0)` })
        .from(invoices)
        .where(and(sql`${invoices.status} not in ('paid','cancelled')`, lt(invoices.dueDate, new Date().toISOString().slice(0, 10)), isNull(invoices.deletedAt)))
    : [{ n: "0", total: "0" }];

  const [atRiskRow] = canSeeProduction
    ? await db
        .select({ n: sql<string>`count(*)` })
        .from(jobOrders)
        .where(
          and(
            sql`${jobOrders.stage} not in ('delivered','invoiced','paid','closed','cancelled','ready_for_delivery')`,
            sql`${jobOrders.targetDeliveryDate} is not null and ${jobOrders.targetDeliveryDate} <= current_date + interval '3 days'`,
            isNull(jobOrders.deletedAt)
          )
        )
    : [{ n: "0" }];

  const [pendingLeaveRow] = canSeeHr
    ? await db.select({ n: sql<string>`count(*)` }).from(leaveRequests).where(eq(leaveRequests.status, "pending"))
    : [{ n: "0" }];

  return {
    unreadNotifications: unread,
    overdueInvoicesCount: Number(overdueRow.n),
    overdueInvoicesCentavos: Number(overdueRow.total),
    atRiskJobOrdersCount: Number(atRiskRow.n),
    pendingLeaveCount: Number(pendingLeaveRow.n),
  };
}

function isDigestEmpty(content: DigestContent): boolean {
  return (
    content.unreadNotifications.length === 0 &&
    content.overdueInvoicesCount === 0 &&
    content.atRiskJobOrdersCount === 0 &&
    content.pendingLeaveCount === 0
  );
}

function renderDigestHtml(recipient: DigestRecipient, content: DigestContent): string {
  const sections: string[] = [];

  if (content.unreadNotifications.length > 0) {
    sections.push(
      `<h3>Unread notifications</h3><ul>${content.unreadNotifications
        .map((n) => `<li><strong>${n.title}</strong>${n.body ? ` — ${n.body}` : ""}</li>`)
        .join("")}</ul>`
    );
  }
  if (content.overdueInvoicesCount > 0) {
    sections.push(
      `<h3>Overdue receivables</h3><p>${content.overdueInvoicesCount} invoice(s), ${formatCentavos(content.overdueInvoicesCentavos)} outstanding.</p>`
    );
  }
  if (content.atRiskJobOrdersCount > 0) {
    sections.push(`<h3>At-risk job orders</h3><p>${content.atRiskJobOrdersCount} job order(s) due within 3 days.</p>`);
  }
  if (content.pendingLeaveCount > 0) {
    sections.push(`<h3>Pending leave requests</h3><p>${content.pendingLeaveCount} awaiting approval.</p>`);
  }

  return `<p>Hi ${recipient.fullName.split(" ")[0]},</p>${sections.join("")}<p>— Llantino Ops</p>`;
}

/** Skips silently (not an error) when RESEND_API_KEY is unset — same convention as quotation email send. */
async function sendDigestEmail(recipient: DigestRecipient): Promise<"sent" | "skipped_empty" | "skipped_no_resend" | "failed"> {
  const content = await buildDigestContent(recipient);
  if (isDigestEmpty(content)) return "skipped_empty";
  if (!process.env.RESEND_API_KEY) return "skipped_no_resend";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "notifications@resend.dev",
      to: recipient.email,
      subject: "Llantino Ops — daily digest",
      html: renderDigestHtml(recipient, content),
    });
    if (error) {
      console.error("sendDigestEmail failed", error);
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("sendDigestEmail threw", e);
    return "failed";
  }
}

export async function sendDailyDigestToAllUsers(): Promise<Record<string, number>> {
  const recipients = await getDigestRecipients();
  const tally: Record<string, number> = { sent: 0, skipped_empty: 0, skipped_no_resend: 0, failed: 0 };

  for (const recipient of recipients) {
    const outcome = await sendDigestEmail(recipient);
    tally[outcome] = (tally[outcome] ?? 0) + 1;
  }

  return tally;
}
