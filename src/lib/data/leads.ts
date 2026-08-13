import "server-only";
import { desc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { leads, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export async function listLeads(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: leads.id,
        name: leads.name,
        company: leads.company,
        contact: leads.contact,
        source: leads.source,
        inquirySummary: leads.inquirySummary,
        stage: leads.stage,
        lostReason: leads.lostReason,
        convertedClientId: leads.convertedClientId,
        assignedTo: leads.assignedTo,
        assignedToName: users.fullName,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .leftJoin(users, eq(users.id, leads.assignedTo))
      .where(isNull(leads.deletedAt))
      .orderBy(desc(leads.createdAt))
  );
}

export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];
