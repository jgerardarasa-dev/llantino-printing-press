"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, leads } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { notify } from "@/lib/notifications/create";
import { leadInsertSchema } from "@/lib/validation/entities";
import { LEAD_STAGES, type LeadStage } from "@/lib/constants/lead-stages";

export type ActionState = { error?: string; success?: boolean };

export async function saveLead(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;

  const parsed = leadInsertSchema.safeParse({
    name: raw.name,
    company: raw.company || undefined,
    contact: raw.contact || undefined,
    source: raw.source,
    inquirySummary: raw.inquirySummary || undefined,
    assignedTo: raw.assignedTo || undefined,
    stage: (raw.stage as string) || "new",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      let previousAssignee: string | null = null;

      if (id) {
        const [existing] = await tx.select({ assignedTo: leads.assignedTo }).from(leads).where(eq(leads.id, id)).limit(1);
        previousAssignee = existing?.assignedTo ?? null;
        await tx.update(leads).set({ ...parsed.data, updatedAt: new Date() }).where(eq(leads.id, id));
      } else {
        await tx.insert(leads).values({ ...parsed.data, createdBy: user.id });
      }

      // Only notify on a genuine (re-)assignment, not every edit to an already-assigned lead.
      if (parsed.data.assignedTo && parsed.data.assignedTo !== previousAssignee && parsed.data.assignedTo !== user.id) {
        await notify(tx, {
          userId: parsed.data.assignedTo,
          type: "lead_assigned",
          title: `Lead assigned: ${parsed.data.name}`,
          body: parsed.data.company || undefined,
          linkUrl: "/leads",
        });
      }
    });
  } catch (e) {
    console.error("saveLead failed", e);
    return { error: "Couldn't save the lead. Please try again." };
  }

  revalidatePath("/leads");
  return { success: true };
}

export async function updateLeadStage(leadId: string, stage: LeadStage, lostReason?: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (!LEAD_STAGES.includes(stage)) {
    return { error: "Invalid stage" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx
      .update(leads)
      .set({ stage, lostReason: stage === "lost" ? (lostReason ?? null) : null, updatedAt: new Date() })
      .where(eq(leads.id, leadId));
  });

  revalidatePath("/leads");
  return { success: true };
}

/**
 * Converts a lead into a client: creates a minimal client record from
 * the lead's known info and links it back via leads.convertedClientId.
 * Sales fills in the client's full profile afterwards on /clients/[id].
 */
export async function convertLeadToClient(leadId: string): Promise<ActionState & { clientId?: string }> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  return withUserContext(user.id, async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) return { error: "Lead not found" };
    if (lead.convertedClientId) {
      return { success: true, clientId: lead.convertedClientId };
    }

    const [client] = await tx
      .insert(clients)
      .values({
        companyName: lead.company || lead.name,
        source: lead.source,
        status: "active",
        ownerUserId: lead.assignedTo ?? user.id,
        notes: lead.inquirySummary ? `Converted from lead: ${lead.inquirySummary}` : null,
        createdBy: user.id,
      })
      .returning({ id: clients.id });

    await tx
      .update(leads)
      .set({ stage: "won", convertedClientId: client.id, updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    revalidatePath("/leads");
    revalidatePath("/clients");
    return { success: true, clientId: client.id };
  });
}
