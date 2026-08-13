"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { quotationItems, quotationTiers, quotations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { getClientById } from "@/lib/data/clients";
import { getBoxSpecWithMaterial, getProcessRatesMap } from "@/lib/data/materials";
import { generateQuoteNumber, listClientJobOrdersForRepeat } from "@/lib/data/quotations";
import { notify, notifyRoles } from "@/lib/notifications/create";
import { computeQuote } from "@/lib/pricing/compute-quote";
import { computeQuoteTiers } from "@/lib/pricing/quantity-tiers";
import type { QuoteBreakdown, QuoteInput } from "@/lib/pricing/types";
import { getSettings } from "@/lib/settings/get-settings";
import { parseOverrides, quotationFormSchema } from "@/lib/validation/forms/quotation-form";

export type ActionState = { error?: string; success?: boolean; quotationId?: string };

const APPROVER_ROLES = ["admin", "management"] as const;

async function buildQuoteInput(
  user: Awaited<ReturnType<typeof getCurrentUser>> & object,
  params: {
    clientId: string;
    boxSpecId: string;
    printMethod: "offset" | "digital";
    isRepeatOrder: boolean;
    spotColourCount: number;
    markupPctOverride?: number;
    applyVat: boolean;
    overrides?: Record<string, { amountCentavos: number; reason: string }>;
  }
): Promise<{ input: Omit<QuoteInput, "quantity">; boxSpecName: string } | { error: string }> {
  const [boxSpecRow, ratesMap, settings, client] = await Promise.all([
    getBoxSpecWithMaterial(user, params.boxSpecId),
    getProcessRatesMap(user),
    getSettings(user),
    getClientById(user, params.clientId),
  ]);

  if (!boxSpecRow || !boxSpecRow.boxSpec) return { error: "Box spec not found." };
  if (!boxSpecRow.material) return { error: "That box spec has no material assigned." };
  if (!client) return { error: "Client not found." };

  const { boxSpec, material } = boxSpecRow;

  return {
    boxSpecName: boxSpec.name,
    input: {
      boxSpec: {
        upsPerSheet: boxSpec.upsPerSheet,
        printColoursFront: boxSpec.printColoursFront,
        printColoursBack: boxSpec.printColoursBack,
        spotColourCount: params.spotColourCount,
        finishing: (boxSpec.finishing as string[]) ?? [],
      },
      material: { costPerSheetCentavos: material.costPerSheetCentavos },
      printMethod: params.printMethod,
      isRepeatOrder: params.isRepeatOrder,
      rates: ratesMap,
      settings: {
        spoilagePct: settings.spoilagePct,
        overheadPct: settings.overheadPct,
        vatPct: settings.vatPct,
        applyVat: params.applyVat,
        approvalMarkupFloorPct: settings.approvalMarkupFloorPct,
        approvalTotalCentavosThreshold: settings.approvalTotalCentavosThreshold,
      },
      markupPctOverride: params.markupPctOverride,
      priceTier: client.priceTier,
      overrides: params.overrides,
    },
  };
}

export async function saveQuotationDraft(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;
  const parsed = quotationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const overrides = parseOverrides(v.overridesJson);

  const context = await buildQuoteInput(user, {
    clientId: v.clientId,
    boxSpecId: v.boxSpecId,
    printMethod: v.printMethod,
    isRepeatOrder: v.isRepeatOrder,
    spotColourCount: v.spotColourCount,
    markupPctOverride: v.markupPctOverride,
    applyVat: v.applyVat,
    overrides,
  });
  if ("error" in context) return { error: context.error };

  let primary: QuoteBreakdown;
  let tiers: { quantity: number; breakdown: QuoteBreakdown }[];
  try {
    primary = computeQuote({ ...context.input, quantity: v.quantity1 });
    tiers = computeQuoteTiers(context.input, [v.quantity1, v.quantity2, v.quantity3]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't compute the quote." };
  }

  try {
    const quotationId = await withUserContext(user.id, async (tx) => {
      let existingStatus: string | undefined;
      if (id) {
        const [existing] = await tx.select({ status: quotations.status }).from(quotations).where(eq(quotations.id, id)).limit(1);
        existingStatus = existing?.status;
        if (existingStatus && !["draft", "rejected"].includes(existingStatus)) {
          throw new Error("Only draft or rejected quotations can be edited.");
        }
      }

      const quoteNumber = id ? undefined : await generateQuoteNumber(tx, "QT");

      let quotationRowId = id;
      if (id) {
        await tx
          .update(quotations)
          .set({
            clientId: v.clientId,
            status: "draft",
            validUntil: new Date(v.validUntil),
            subtotalCentavos: primary.lineTotalCentavos,
            vatCentavos: primary.vatCentavos,
            totalCentavos: primary.grandTotalCentavos,
            markupPct: Math.round(primary.markupPct * 100),
            notes: v.notes || null,
            terms: v.terms || null,
            rejectedReason: null,
            updatedAt: new Date(),
          })
          .where(eq(quotations.id, id));
      } else {
        const [created] = await tx
          .insert(quotations)
          .values({
            quoteNumber: quoteNumber!,
            clientId: v.clientId,
            preparedBy: user.id,
            status: "draft",
            validUntil: new Date(v.validUntil),
            subtotalCentavos: primary.lineTotalCentavos,
            vatCentavos: primary.vatCentavos,
            totalCentavos: primary.grandTotalCentavos,
            markupPct: Math.round(primary.markupPct * 100),
            notes: v.notes || null,
            terms: v.terms || null,
            createdBy: user.id,
          })
          .returning({ id: quotations.id });
        quotationRowId = created.id;
      }

      const existingItems = await tx
        .select({ id: quotationItems.id })
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, quotationRowId!));

      let itemId: string;
      if (existingItems[0]) {
        itemId = existingItems[0].id;
        await tx
          .update(quotationItems)
          .set({
            boxSpecId: v.boxSpecId,
            description: context.boxSpecName,
            quantity: v.quantity1,
            costBreakdown: primary,
            unitPriceCentavos: primary.unitPriceCentavos,
            lineTotalCentavos: primary.lineTotalCentavos,
            leadTimeDays: v.leadTimeDays ?? null,
            updatedAt: new Date(),
          })
          .where(eq(quotationItems.id, itemId));
        await tx.delete(quotationTiers).where(eq(quotationTiers.quotationItemId, itemId));
      } else {
        const [createdItem] = await tx
          .insert(quotationItems)
          .values({
            quotationId: quotationRowId!,
            boxSpecId: v.boxSpecId,
            description: context.boxSpecName,
            quantity: v.quantity1,
            costBreakdown: primary,
            unitPriceCentavos: primary.unitPriceCentavos,
            lineTotalCentavos: primary.lineTotalCentavos,
            leadTimeDays: v.leadTimeDays ?? null,
            createdBy: user.id,
          })
          .returning({ id: quotationItems.id });
        itemId = createdItem.id;
      }

      await tx.insert(quotationTiers).values(
        tiers.map((t) => ({
          quotationItemId: itemId,
          quantity: t.quantity,
          unitPriceCentavos: t.breakdown.unitPriceCentavos,
          createdBy: user.id,
        }))
      );

      return quotationRowId!;
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    return { success: true, quotationId };
  } catch (e) {
    console.error("saveQuotationDraft failed", e);
    return { error: e instanceof Error ? e.message : "Couldn't save the quotation." };
  }
}

/**
 * Smart "send" — routes to pending_approval instead of sent when the
 * stored breakdown requires it (SPEC §7: "cannot be sent until a
 * management user approves"). One button for sales; approval is a
 * separate explicit step for management below.
 */
export async function sendOrSubmitQuotation(quotationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      const [quotation] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
      if (!quotation) throw new Error("Quotation not found.");
      if (!["draft", "approved"].includes(quotation.status)) {
        throw new Error(`Can't send a quotation in "${quotation.status}" status.`);
      }

      const [item] = await tx.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).limit(1);
      const breakdown = item?.costBreakdown as QuoteBreakdown | undefined;

      if (quotation.status === "draft" && breakdown?.requiresApproval) {
        await tx.update(quotations).set({ status: "pending_approval", updatedAt: new Date() }).where(eq(quotations.id, quotationId));
        await notifyRoles(tx, [...APPROVER_ROLES], {
          type: "quotation_pending_approval",
          title: `Quotation ${quotation.quoteNumber} needs approval`,
          linkUrl: `/quotations/${quotationId}`,
        });
      } else {
        await tx.update(quotations).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(quotations.id, quotationId));
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't update the quotation." };
  }

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { success: true };
}

export async function approveQuotation(quotationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, [...APPROVER_ROLES]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  await withUserContext(user.id, async (tx) => {
    const [quotation] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);

    await tx
      .update(quotations)
      .set({ status: "approved", approvedBy: user.id, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(quotations.id, quotationId));

    if (quotation && quotation.preparedBy !== user.id) {
      await notify(tx, {
        userId: quotation.preparedBy,
        type: "quotation_decided",
        title: `Quotation ${quotation.quoteNumber} approved`,
        linkUrl: `/quotations/${quotationId}`,
      });
    }
  });

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { success: true };
}

export async function rejectQuotation(quotationId: string, reason: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, [...APPROVER_ROLES]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (!reason.trim()) return { error: "A rejection reason is required." };

  await withUserContext(user.id, async (tx) => {
    const [quotation] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);

    await tx
      .update(quotations)
      .set({ status: "rejected", rejectedReason: reason, updatedAt: new Date() })
      .where(eq(quotations.id, quotationId));

    if (quotation && quotation.preparedBy !== user.id) {
      await notify(tx, {
        userId: quotation.preparedBy,
        type: "quotation_decided",
        title: `Quotation ${quotation.quoteNumber} rejected`,
        body: reason,
        linkUrl: `/quotations/${quotationId}`,
      });
    }
  });

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { success: true };
}

/** Copies a quotation into a new draft version — SPEC §5 revisions/versioning. */
export async function createRevision(quotationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  try {
    const newId = await withUserContext(user.id, async (tx) => {
      const [original] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
      if (!original) throw new Error("Quotation not found.");
      const [item] = await tx.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).limit(1);

      const quoteNumber = await generateQuoteNumber(tx, "QT");
      const [created] = await tx
        .insert(quotations)
        .values({
          quoteNumber,
          clientId: original.clientId,
          leadId: original.leadId,
          preparedBy: user.id,
          status: "draft",
          validUntil: original.validUntil,
          subtotalCentavos: original.subtotalCentavos,
          vatCentavos: original.vatCentavos,
          totalCentavos: original.totalCentavos,
          markupPct: original.markupPct,
          notes: original.notes,
          terms: original.terms,
          revisionOfQuotationId: original.id,
          version: original.version + 1,
          createdBy: user.id,
        })
        .returning({ id: quotations.id });

      if (item) {
        const [newItem] = await tx
          .insert(quotationItems)
          .values({
            quotationId: created.id,
            boxSpecId: item.boxSpecId,
            description: item.description,
            quantity: item.quantity,
            costBreakdown: item.costBreakdown,
            unitPriceCentavos: item.unitPriceCentavos,
            lineTotalCentavos: item.lineTotalCentavos,
            leadTimeDays: item.leadTimeDays,
            createdBy: user.id,
          })
          .returning({ id: quotationItems.id });

        const oldTiers = await tx.select().from(quotationTiers).where(eq(quotationTiers.quotationItemId, item.id));
        if (oldTiers.length > 0) {
          await tx.insert(quotationTiers).values(
            oldTiers.map((t) => ({
              quotationItemId: newItem.id,
              quantity: t.quantity,
              unitPriceCentavos: t.unitPriceCentavos,
              createdBy: user.id,
            }))
          );
        }
      }

      return created.id;
    });

    revalidatePath("/quotations");
    return { success: true, quotationId: newId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create a revision." };
  }
}

export async function getClientJobOrdersForRepeat(clientId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch {
    return [];
  }
  return listClientJobOrdersForRepeat(user, clientId);
}
