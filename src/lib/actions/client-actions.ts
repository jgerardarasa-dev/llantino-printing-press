"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, contacts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { clientFormSchema } from "@/lib/validation/forms/client-form";
import { contactInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

/** Create or update a client — presence of a hidden "id" field decides which. */
export async function saveClient(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const values = {
    companyName: v.companyName,
    tradeName: v.tradeName || null,
    industry: v.industry || null,
    tin: v.tin || null,
    addressLine1: v.addressLine1 || null,
    city: v.city || null,
    region: v.region || null,
    isVatRegistered: v.isVatRegistered,
    paymentTermsDays: v.paymentTermsDays,
    // Money crosses from a decimal peso input to integer centavos exactly
    // once, at this form boundary — never re-derived or re-computed
    // downstream from a float after this point.
    creditLimitCentavos: Math.round(v.creditLimitPesos * 100),
    priceTier: v.priceTier,
    ownerUserId: v.ownerUserId,
    source: v.source,
    status: v.status,
    notes: v.notes || null,
  };

  try {
    await withUserContext(user.id, async (tx) => {
      if (v.id) {
        await tx.update(clients).set({ ...values, updatedAt: new Date() }).where(eq(clients.id, v.id!));
      } else {
        await tx.insert(clients).values({ ...values, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveClient failed", e);
    return { error: "Couldn't save the client. Please try again." };
  }

  revalidatePath("/clients");
  if (v.id) revalidatePath(`/clients/${v.id}`);
  return { success: true };
}

export async function softDeleteClient(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
  });

  revalidatePath("/clients");
  return { success: true };
}

export async function saveContact(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;
  const parsed = contactInsertSchema.safeParse({
    clientId: raw.clientId,
    name: raw.name,
    position: raw.position || undefined,
    email: raw.email || undefined,
    mobile: raw.mobile || undefined,
    isPrimary: raw.isPrimary === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      if (id) {
        await tx.update(contacts).set({ ...parsed.data, updatedAt: new Date() }).where(eq(contacts.id, id));
      } else {
        await tx.insert(contacts).values({ ...parsed.data, createdBy: user.id });
      }
    });
  } catch (e) {
    console.error("saveContact failed", e);
    return { error: "Couldn't save the contact. Please try again." };
  }

  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { success: true };
}

export async function deleteContact(id: string, clientId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    await tx.update(contacts).set({ deletedAt: new Date() }).where(eq(contacts.id, id));
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
