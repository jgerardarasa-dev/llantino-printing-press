"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { deliveries, jobOrders, joChecklists, quotationItems, quotations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { generateJoNumber } from "@/lib/data/job-orders";
import { assertValidTransition, type TransitionGateContext } from "@/lib/job-orders/state-machine";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import type { UserRole } from "@/lib/constants/roles";
import { QC_CHECKLIST_TEMPLATE } from "@/lib/job-orders/qc-checklist-template";

export type ActionState = { error?: string; success?: boolean; jobOrderId?: string };

const STAGE_ROLES: UserRole[] = ["admin", "management", "sales", "production"];
const MANAGER_ROLES: UserRole[] = ["admin", "management"];

export async function createJobOrderFromQuotation(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const quotationId = formData.get("quotationId") as string;
  const clientPoNumber = (formData.get("clientPoNumber") as string) || null;
  const targetDeliveryDate = (formData.get("targetDeliveryDate") as string) || null;
  const priority = (formData.get("priority") as string) || "normal";

  if (!quotationId) return { error: "Missing quotation." };

  try {
    const jobOrderId = await withUserContext(user.id, async (tx) => {
      const [quotation] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
      if (!quotation) throw new Error("Quotation not found.");
      if (!["sent", "approved"].includes(quotation.status)) {
        throw new Error("Only a sent or approved quotation can become a job order.");
      }
      if (!quotation.clientId) throw new Error("This quotation has no client.");

      const [item] = await tx.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).limit(1);
      if (!item) throw new Error("This quotation has no item to build a job order from.");

      const joNumber = await generateJoNumber(tx, "JO");

      const [created] = await tx
        .insert(jobOrders)
        .values({
          joNumber,
          clientId: quotation.clientId,
          quotationId: quotation.id,
          clientPoNumber,
          boxSpecId: item.boxSpecId,
          quantityOrdered: item.quantity,
          unitPriceCentavos: item.unitPriceCentavos,
          totalCentavos: item.lineTotalCentavos,
          stage: "draft",
          priority: priority as "normal" | "rush" | "critical",
          orderDate: new Date().toISOString().slice(0, 10),
          targetDeliveryDate,
          salesOwnerId: quotation.preparedBy,
          createdBy: user.id,
        })
        .returning({ id: jobOrders.id });

      return created.id;
    });

    revalidatePath("/job-orders");
    revalidatePath(`/quotations/${quotationId}`);
    return { success: true, jobOrderId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create the job order." };
  }
}

async function buildGateContext(
  tx: Parameters<Parameters<typeof withUserContext>[1]>[0],
  jobOrderId: string,
  fromStage: JobOrderStage,
  toStage: JobOrderStage,
  hasProofApproval: boolean
): Promise<TransitionGateContext> {
  const gates: TransitionGateContext = { hasProofApproval };

  if (fromStage === "quality_check" && toStage === "packing") {
    const items = await tx.select().from(joChecklists).where(eq(joChecklists.jobOrderId, jobOrderId));
    gates.allChecklistItemsDone = items.length > 0 && items.every((i) => i.isDone);
  }

  if (fromStage === "delivered" && toStage === "invoiced") {
    const rows = await tx
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.jobOrderId, jobOrderId), eq(deliveries.status, "delivered")));
    gates.hasCompletedDelivery = rows.some((d) => d.deliveredAt !== null);
  }

  return gates;
}

export async function advanceJobOrderStage(
  jobOrderId: string,
  toStage: JobOrderStage,
  options: { note?: string; hasProofApproval?: boolean; clientPoNumber?: string } = {}
): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, STAGE_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  try {
    await withUserContext(user.id, async (tx) => {
      const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
      if (!jo) throw new Error("Job order not found.");

      const fromStage = jo.stage as JobOrderStage;
      const gates = await buildGateContext(tx, jobOrderId, fromStage, toStage, options.hasProofApproval ?? false);

      const direction = assertValidTransition(fromStage, toStage, gates);

      if (direction === "backward" && !options.note?.trim()) {
        throw new Error("A note is required when moving a job order backward for rework.");
      }
      if (fromStage === "draft" && toStage === "for_artwork" && !(jo.clientPoNumber || options.clientPoNumber)) {
        throw new Error("A client PO number is required before moving out of draft.");
      }

      // Session-local GUC the jo_stage_history trigger reads for the
      // rework note — see 0002_jo_stage_history_trigger.sql.
      await tx.execute(sql`select set_config('llantino.stage_note', ${options.note ?? ""}, true)`);

      await tx
        .update(jobOrders)
        .set({
          stage: toStage,
          clientPoNumber: options.clientPoNumber || jo.clientPoNumber,
          productionOwnerId: jo.productionOwnerId ?? (user.role === "production" ? user.id : jo.productionOwnerId),
          updatedAt: new Date(),
        })
        .where(eq(jobOrders.id, jobOrderId));

      // Seed the default QC checklist the first time a JO reaches
      // quality_check, so the packing gate has something to check.
      if (toStage === "quality_check") {
        const existing = await tx.select().from(joChecklists).where(eq(joChecklists.jobOrderId, jobOrderId));
        if (existing.length === 0) {
          await tx.insert(joChecklists).values(
            QC_CHECKLIST_TEMPLATE.map((label) => ({
              jobOrderId,
              stage: "quality_check" as const,
              itemLabel: label,
              createdBy: user.id,
            }))
          );
        }
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't advance the job order." };
  }

  revalidatePath(`/job-orders/${jobOrderId}`);
  revalidatePath("/job-orders");
  return { success: true };
}

export async function toggleJobOrderHold(jobOrderId: string, isOnHold: boolean, holdReason?: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, STAGE_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (isOnHold && !holdReason?.trim()) {
    return { error: "A reason is required to put a job order on hold." };
  }

  await withUserContext(user.id, async (tx) => {
    await tx
      .update(jobOrders)
      .set({ isOnHold, holdReason: isOnHold ? holdReason : null, updatedAt: new Date() })
      .where(eq(jobOrders.id, jobOrderId));
  });

  revalidatePath(`/job-orders/${jobOrderId}`);
  revalidatePath("/job-orders");
  return { success: true };
}

/** Terminal, and requires manager approval — SPEC §6. */
export async function cancelJobOrder(jobOrderId: string, reason: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, [...MANAGER_ROLES]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (!reason.trim()) return { error: "A cancellation reason is required." };

  try {
    await withUserContext(user.id, async (tx) => {
      const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
      if (!jo) throw new Error("Job order not found.");

      assertValidTransition(jo.stage as JobOrderStage, "cancelled");
      await tx.execute(sql`select set_config('llantino.stage_note', ${reason}, true)`);
      await tx
        .update(jobOrders)
        .set({ stage: "cancelled", cancelledReason: reason, isOnHold: false, updatedAt: new Date() })
        .where(eq(jobOrders.id, jobOrderId));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't cancel the job order." };
  }

  revalidatePath(`/job-orders/${jobOrderId}`);
  revalidatePath("/job-orders");
  return { success: true };
}
