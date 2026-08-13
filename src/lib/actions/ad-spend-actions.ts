"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { adSpend, settings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AD_SPEND_ROLES, assertRole } from "@/lib/auth/permissions";
import { SETTINGS_KEYS } from "@/lib/settings/keys";
import { adSpendInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean };

/** SPEC §8 Meta Ads: "A manual monthly entry form." */
export async function saveAdSpend(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, AD_SPEND_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = adSpendInsertSchema.safeParse({
    month: raw.month,
    platform: raw.platform || "meta",
    campaignName: raw.campaignName || null,
    spendCentavos: Math.round(Number(raw.spendPesos || 0) * 100),
    leadsGenerated: Number(raw.leadsGenerated || 0),
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(adSpend).values({ ...parsed.data, createdBy: user.id });
    });
  } catch (e) {
    console.error("saveAdSpend failed", e);
    return { error: "Couldn't save the ad spend entry." };
  }

  revalidatePath("/analytics/ads");
  return { success: true };
}

/**
 * Settings write RLS ("settings_admin_write") is admin-only, stricter
 * than AD_SPEND_ROLES — management can log spend but not repoint the
 * Ads Manager link / account id.
 */
export async function saveMetaAdsSettings(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, ["admin"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const accountId = String(formData.get("metaAdsAccountId") ?? "").trim();
  const managerUrl = String(formData.get("metaAdsManagerUrl") ?? "").trim();

  try {
    await withUserContext(user.id, async (tx) => {
      await tx
        .insert(settings)
        .values({
          key: SETTINGS_KEYS.META_ADS,
          value: { accountId, managerUrl: managerUrl || "https://adsmanager.facebook.com/" },
          description: "Meta Ads Manager account id + link (SPEC §8).",
          updatedBy: user.id,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: sql`excluded.value`, updatedAt: new Date(), updatedBy: user.id },
        });
    });
  } catch (e) {
    console.error("saveMetaAdsSettings failed", e);
    return { error: "Couldn't save Meta Ads settings." };
  }

  revalidatePath("/analytics/ads");
  return { success: true };
}
