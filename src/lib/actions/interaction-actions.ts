"use server";

import { revalidatePath } from "next/cache";

import { withUserContext } from "@/db/client";
import { interactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { interactionInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

export async function logInteraction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const clientId = typeof raw.clientId === "string" && raw.clientId ? raw.clientId : undefined;
  const leadId = typeof raw.leadId === "string" && raw.leadId ? raw.leadId : undefined;

  if (!clientId && !leadId) {
    return { error: "An interaction must be linked to a client or a lead." };
  }

  const parsed = interactionInsertSchema.safeParse({
    clientId,
    leadId,
    userId: user.id,
    type: raw.type,
    summary: raw.summary,
    occurredAt: raw.occurredAt ? new Date(raw.occurredAt as string) : new Date(),
    nextAction: raw.nextAction || undefined,
    nextActionDate: raw.nextActionDate || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(interactions).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("logInteraction failed", e);
    return { error: "Couldn't save the interaction. Please try again." };
  }

  if (clientId) revalidatePath(`/clients/${clientId}`);
  if (leadId) revalidatePath(`/leads`);
  return { success: true };
}
