import "server-only";
import { and, desc, eq, inArray, isNull, like } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import {
  boxSpecs,
  clients,
  expenses,
  invoices,
  jobOrders,
  joMaterials,
  materials,
  payments,
  quotationItems,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import type { QuoteBreakdown } from "@/lib/pricing/types";

type Tx = Parameters<Parameters<typeof withUserContext>[1]>[0];

export async function generateInvoiceNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `INV-${year}-%`;
  const existing = await tx
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, pattern));
  const seq = existing.length + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function listInvoices(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        jobOrderId: invoices.jobOrderId,
        joNumber: jobOrders.joNumber,
        clientName: clients.companyName,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        totalCentavos: invoices.totalCentavos,
        amountPaidCentavos: invoices.amountPaidCentavos,
        balanceCentavos: invoices.balanceCentavos,
        status: invoices.status,
      })
      .from(invoices)
      .leftJoin(clients, eq(clients.id, invoices.clientId))
      .leftJoin(jobOrders, eq(jobOrders.id, invoices.jobOrderId))
      .where(isNull(invoices.deletedAt))
      .orderBy(desc(invoices.invoiceDate))
  );
}
export type InvoiceListRow = Awaited<ReturnType<typeof listInvoices>>[number];

export async function getInvoiceDetail(user: CurrentUser, invoiceId: string) {
  return withUserContext(user.id, async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!invoice) return null;

    const [client, jobOrder, paymentRows] = await Promise.all([
      tx.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1).then((r) => r[0] ?? null),
      tx.select().from(jobOrders).where(eq(jobOrders.id, invoice.jobOrderId)).limit(1).then((r) => r[0] ?? null),
      tx
        .select({ payment: payments, receivedByName: users.fullName })
        .from(payments)
        .leftJoin(users, eq(users.id, payments.receivedBy))
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(desc(payments.paymentDate)),
    ]);

    return { invoice, client, jobOrder, payments: paymentRows };
  });
}
export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;

/** Delivered-but-not-yet-invoiced JOs — candidates for invoice generation. */
export async function listDeliveredJobOrdersAwaitingInvoice(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        clientName: clients.companyName,
        totalCentavos: jobOrders.totalCentavos,
        actualDeliveryDate: jobOrders.actualDeliveryDate,
      })
      .from(jobOrders)
      .leftJoin(clients, eq(clients.id, jobOrders.clientId))
      .where(eq(jobOrders.stage, "delivered"))
      .orderBy(desc(jobOrders.actualDeliveryDate))
  );
}

export async function listExpenses(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: expenses.id,
        category: expenses.category,
        vendor: expenses.vendor,
        description: expenses.description,
        amountCentavos: expenses.amountCentavos,
        expenseDate: expenses.expenseDate,
        jobOrderId: expenses.jobOrderId,
        joNumber: jobOrders.joNumber,
        paymentMethod: expenses.paymentMethod,
        recordedByName: users.fullName,
      })
      .from(expenses)
      .leftJoin(jobOrders, eq(jobOrders.id, expenses.jobOrderId))
      .leftJoin(users, eq(users.id, expenses.recordedBy))
      .where(isNull(expenses.deletedAt))
      .orderBy(desc(expenses.expenseDate))
  );
}
export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];

const COSTED_STAGES = ["delivered", "invoiced", "paid", "closed"] as const;

/**
 * SPEC §8/§10: "quoted cost vs actual cost per JO ... actual = expenses
 * tagged to the JO + materials issued at cost + logged labour hours ×
 * rate." Labour-hours costing is omitted — there's no per-operator
 * hourly rate in the data model (employees have a daily/monthly rate,
 * but turning jo_production_logs time spans into a costed labour line
 * needs an assumption SPEC doesn't specify) — documented in README
 * rather than fabricated. Materials are costed at *current* material
 * rates since jo_materials doesn't snapshot cost-per-sheet at issuance.
 */
export async function listJobCosting(user: CurrentUser) {
  return withUserContext(user.id, async (tx) => {
    const jos = await tx
      .select({
        id: jobOrders.id,
        joNumber: jobOrders.joNumber,
        clientName: clients.companyName,
        boxSpecName: boxSpecs.name,
        quotationId: jobOrders.quotationId,
        totalCentavos: jobOrders.totalCentavos,
      })
      .from(jobOrders)
      .leftJoin(clients, eq(clients.id, jobOrders.clientId))
      .leftJoin(boxSpecs, eq(boxSpecs.id, jobOrders.boxSpecId))
      .where(inArray(jobOrders.stage, COSTED_STAGES))
      .orderBy(desc(jobOrders.orderDate));

    const rows = await Promise.all(
      jos.map(async (jo) => {
        const [quotedRow, expenseRows, materialRows] = await Promise.all([
          jo.quotationId
            ? tx
                .select({ costBreakdown: quotationItems.costBreakdown })
                .from(quotationItems)
                .where(eq(quotationItems.quotationId, jo.quotationId))
                .limit(1)
            : Promise.resolve([]),
          tx
            .select({ amountCentavos: expenses.amountCentavos })
            .from(expenses)
            .where(and(eq(expenses.jobOrderId, jo.id), isNull(expenses.deletedAt))),
          tx
            .select({ sheetsUsed: joMaterials.sheetsUsed, costPerSheetCentavos: materials.costPerSheetCentavos })
            .from(joMaterials)
            .leftJoin(materials, eq(materials.id, joMaterials.materialId))
            .where(eq(joMaterials.jobOrderId, jo.id)),
        ]);

        const quotedCostCentavos = quotedRow[0]
          ? Math.round((quotedRow[0].costBreakdown as QuoteBreakdown).totalCostCentavos)
          : null;
        const expenseCostCentavos = expenseRows.reduce((sum, e) => sum + e.amountCentavos, 0);
        const materialCostCentavos = materialRows.reduce(
          (sum, m) => sum + m.sheetsUsed * (m.costPerSheetCentavos ?? 0),
          0
        );
        const actualCostCentavos = expenseCostCentavos + materialCostCentavos;
        const variancePct = quotedCostCentavos && quotedCostCentavos > 0
          ? Math.round(((actualCostCentavos - quotedCostCentavos) / quotedCostCentavos) * 1000) / 10
          : null;

        return {
          id: jo.id,
          joNumber: jo.joNumber,
          clientName: jo.clientName,
          boxSpecName: jo.boxSpecName,
          quotedCostCentavos,
          actualCostCentavos,
          variancePct,
        };
      })
    );

    return rows;
  });
}
export type JobCostingRow = Awaited<ReturnType<typeof listJobCosting>>[number];
