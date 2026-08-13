import "server-only";
import { desc, eq, like } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, jobOrders, quotationItems, quotationTiers, quotations, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

type Tx = Parameters<Parameters<typeof withUserContext>[1]>[0];

/** QT-2026-0001, sequential per year. Called inside the same transaction as the insert. */
export async function generateQuoteNumber(tx: Tx, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const existing = await tx
    .select({ quoteNumber: quotations.quoteNumber })
    .from(quotations)
    .where(like(quotations.quoteNumber, pattern));
  const seq = existing.length + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export async function listQuotations(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: quotations.id,
        quoteNumber: quotations.quoteNumber,
        status: quotations.status,
        clientId: quotations.clientId,
        clientName: clients.companyName,
        totalCentavos: quotations.totalCentavos,
        validUntil: quotations.validUntil,
        version: quotations.version,
        preparedByName: users.fullName,
        createdAt: quotations.createdAt,
      })
      .from(quotations)
      .leftJoin(clients, eq(clients.id, quotations.clientId))
      .leftJoin(users, eq(users.id, quotations.preparedBy))
      .orderBy(desc(quotations.createdAt))
  );
}
export type QuotationListRow = Awaited<ReturnType<typeof listQuotations>>[number];

export async function getQuotationDetail(user: CurrentUser, quotationId: string) {
  return withUserContext(user.id, async (tx) => {
    const [quotation] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quotation) return null;

    const [client, preparer, approver, items] = await Promise.all([
      quotation.clientId
        ? tx.select().from(clients).where(eq(clients.id, quotation.clientId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      tx.select().from(users).where(eq(users.id, quotation.preparedBy)).limit(1).then((r) => r[0] ?? null),
      quotation.approvedBy
        ? tx.select().from(users).where(eq(users.id, quotation.approvedBy)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      tx.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)),
    ]);

    const item = items[0] ?? null;
    const tiers = item
      ? await tx
          .select()
          .from(quotationTiers)
          .where(eq(quotationTiers.quotationItemId, item.id))
          .orderBy(quotationTiers.createdAt)
      : [];

    return { quotation, client, preparer, approver, item, tiers };
  });
}
export type QuotationDetail = NonNullable<Awaited<ReturnType<typeof getQuotationDetail>>>;

/** For the "repeat order" picker on the quotation builder. */
export async function listClientJobOrdersForRepeat(user: CurrentUser, clientId: string) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        boxSpecId: jobOrders.boxSpecId,
        quantityOrdered: jobOrders.quantityOrdered,
        unitPriceCentavos: jobOrders.unitPriceCentavos,
        orderDate: jobOrders.orderDate,
      })
      .from(jobOrders)
      .where(eq(jobOrders.clientId, clientId))
      .orderBy(desc(jobOrders.orderDate))
  );
}
