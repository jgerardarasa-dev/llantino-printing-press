import "server-only";
import { and, desc, eq, like } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import {
  attachments,
  boxSpecs,
  clients,
  comments,
  deliveries,
  jobOrders,
  joChecklists,
  joMaterials,
  joProductionLogs,
  joStageHistory,
  materials,
  quotations,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

type Tx = Parameters<Parameters<typeof withUserContext>[1]>[0];

export async function generateJoNumber(tx: Tx, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const existing = await tx
    .select({ joNumber: jobOrders.joNumber })
    .from(jobOrders)
    .where(like(jobOrders.joNumber, pattern));
  const seq = existing.length + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export async function generateDrNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `DR-${year}-%`;
  const existing = await tx
    .select({ drNumber: deliveries.drNumber })
    .from(deliveries)
    .where(like(deliveries.drNumber, pattern));
  const seq = existing.length + 1;
  return `DR-${year}-${String(seq).padStart(4, "0")}`;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const DONE_STAGES = new Set(["delivered", "invoiced", "paid", "closed", "cancelled"]);

function isAtRisk(stage: string, targetDeliveryDate: string | null): boolean {
  if (!targetDeliveryDate || DONE_STAGES.has(stage) || stage === "ready_for_delivery") return false;
  const target = new Date(targetDeliveryDate).getTime();
  return target - Date.now() <= THREE_DAYS_MS;
}

export async function listJobOrders(user: CurrentUser) {
  const rows = await withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        clientName: clients.companyName,
        boxSpecName: boxSpecs.name,
        quantityOrdered: jobOrders.quantityOrdered,
        quantityProduced: jobOrders.quantityProduced,
        stage: jobOrders.stage,
        priority: jobOrders.priority,
        targetDeliveryDate: jobOrders.targetDeliveryDate,
        isOnHold: jobOrders.isOnHold,
        totalCentavos: jobOrders.totalCentavos,
        productionOwnerName: users.fullName,
        createdAt: jobOrders.createdAt,
      })
      .from(jobOrders)
      .leftJoin(clients, eq(clients.id, jobOrders.clientId))
      .leftJoin(boxSpecs, eq(boxSpecs.id, jobOrders.boxSpecId))
      .leftJoin(users, eq(users.id, jobOrders.productionOwnerId))
      .orderBy(desc(jobOrders.createdAt))
  );

  const hideCommercials = user.role === "production";
  return rows.map((r) => ({
    ...r,
    totalCentavos: hideCommercials ? null : r.totalCentavos,
    isAtRisk: isAtRisk(r.stage, r.targetDeliveryDate),
  }));
}
export type JobOrderListRow = Awaited<ReturnType<typeof listJobOrders>>[number];

/**
 * SPEC §4/§6 critical rule: production must never see selling price or
 * client contact info. Trimmed here at the data layer — the strongest
 * of the three enforcement layers, since it means the price/contact
 * fields never leave the server for a production-role request, not just
 * "hidden" in the UI.
 */
export async function getJobOrderDetail(user: CurrentUser, jobOrderId: string) {
  const hideCommercials = user.role === "production";

  return withUserContext(user.id, async (tx) => {
    const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
    if (!jo) return null;

    const [clientRow, boxSpecRow, salesOwner, productionOwner, quotation] = await Promise.all([
      tx.select().from(clients).where(eq(clients.id, jo.clientId)).limit(1).then((r) => r[0] ?? null),
      jo.boxSpecId
        ? tx
            .select({ boxSpec: boxSpecs, material: materials })
            .from(boxSpecs)
            .leftJoin(materials, eq(materials.id, boxSpecs.materialId))
            .where(eq(boxSpecs.id, jo.boxSpecId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      jo.salesOwnerId
        ? tx.select().from(users).where(eq(users.id, jo.salesOwnerId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      jo.productionOwnerId
        ? tx.select().from(users).where(eq(users.id, jo.productionOwnerId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      jo.quotationId
        ? tx.select().from(quotations).where(eq(quotations.id, jo.quotationId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
    ]);

    const [productionLogs, materialsIssued, checklist, deliveryRows, stageHistory, attachmentRows, commentRows] = await Promise.all([
      tx
        .select({ log: joProductionLogs, operatorName: users.fullName })
        .from(joProductionLogs)
        .leftJoin(users, eq(users.id, joProductionLogs.operatorId))
        .where(eq(joProductionLogs.jobOrderId, jobOrderId))
        .orderBy(desc(joProductionLogs.createdAt)),
      tx
        .select({ issued: joMaterials, materialName: materials.name })
        .from(joMaterials)
        .leftJoin(materials, eq(materials.id, joMaterials.materialId))
        .where(eq(joMaterials.jobOrderId, jobOrderId))
        .orderBy(desc(joMaterials.createdAt)),
      tx.select().from(joChecklists).where(eq(joChecklists.jobOrderId, jobOrderId)).orderBy(joChecklists.createdAt),
      tx.select().from(deliveries).where(eq(deliveries.jobOrderId, jobOrderId)).orderBy(desc(deliveries.createdAt)),
      tx
        .select({ history: joStageHistory, changedByName: users.fullName })
        .from(joStageHistory)
        .leftJoin(users, eq(users.id, joStageHistory.changedBy))
        .where(eq(joStageHistory.jobOrderId, jobOrderId))
        .orderBy(desc(joStageHistory.changedAt)),
      tx
        .select()
        .from(attachments)
        // entity_type mirrors the real table name ("job_orders"), the
        // same convention the activity_log trigger uses via tg_table_name.
        .where(and(eq(attachments.entityType, "job_orders"), eq(attachments.entityId, jobOrderId))),
      tx
        .select({ comment: comments, authorName: users.fullName })
        .from(comments)
        .leftJoin(users, eq(users.id, comments.authorId))
        .where(and(eq(comments.entityType, "job_orders"), eq(comments.entityId, jobOrderId)))
        .orderBy(desc(comments.createdAt)),
    ]);

    return {
      jobOrder: hideCommercials
        ? { ...jo, unitPriceCentavos: null, totalCentavos: null }
        : jo,
      client: clientRow
        ? hideCommercials
          ? { id: clientRow.id, companyName: clientRow.companyName }
          : clientRow
        : null,
      boxSpec: boxSpecRow?.boxSpec ?? null,
      material: boxSpecRow?.material ?? null,
      salesOwner: hideCommercials ? null : salesOwner,
      productionOwner,
      quotation: hideCommercials ? null : quotation,
      productionLogs,
      materialsIssued,
      checklist,
      deliveries: deliveryRows,
      stageHistory,
      attachments: attachmentRows,
      comments: commentRows,
      hideCommercials,
    };
  });
}
export type JobOrderDetail = NonNullable<Awaited<ReturnType<typeof getJobOrderDetail>>>;

export async function getDeliveryDetail(user: CurrentUser, deliveryId: string) {
  return withUserContext(user.id, async (tx) => {
    const [delivery] = await tx.select().from(deliveries).where(eq(deliveries.id, deliveryId)).limit(1);
    if (!delivery) return null;

    const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, delivery.jobOrderId)).limit(1);
    if (!jo) return null;

    const [clientRow, boxSpecRow] = await Promise.all([
      tx.select().from(clients).where(eq(clients.id, jo.clientId)).limit(1).then((r) => r[0] ?? null),
      jo.boxSpecId
        ? tx.select().from(boxSpecs).where(eq(boxSpecs.id, jo.boxSpecId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
    ]);

    return { delivery, jobOrder: jo, client: clientRow, boxSpec: boxSpecRow };
  });
}
