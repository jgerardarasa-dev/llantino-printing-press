"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, invoices, jobOrders, payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ACCOUNTING_WRITE_ROLES, assertRole } from "@/lib/auth/permissions";
import { generateInvoiceNumber } from "@/lib/data/accounting";
import { advanceJobOrderStage } from "@/lib/actions/job-order-actions";
import { getSettings } from "@/lib/settings/get-settings";
import { applyPercent } from "@/lib/pricing/rounding";

export type ActionState = { error?: string; success?: boolean; invoiceId?: string };

export async function generateInvoiceFromJobOrder(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, ACCOUNTING_WRITE_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const jobOrderId = formData.get("jobOrderId") as string;
  const withholdingTaxPesos = Number(formData.get("withholdingTaxPesos") || 0);
  if (!jobOrderId) return { error: "Select a job order." };

  try {
    const invoiceId = await withUserContext(user.id, async (tx) => {
      const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
      if (!jo) throw new Error("Job order not found.");
      if (jo.stage !== "delivered") throw new Error("Only a delivered job order can be invoiced.");

      const [existing] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.jobOrderId, jobOrderId)).limit(1);
      if (existing) throw new Error("This job order already has an invoice.");

      const [client] = await tx.select().from(clients).where(eq(clients.id, jo.clientId)).limit(1);
      if (!client) throw new Error("Client not found.");

      const settings = await getSettings(user);
      const applyVat = client.isVatRegistered || settings.companyIsVatRegistered;

      const subtotalCentavos = jo.totalCentavos;
      const vatCentavos = applyVat ? applyPercent(subtotalCentavos, settings.vatPct) : 0;
      const withholdingTaxCentavos = Math.round(withholdingTaxPesos * 100);
      const totalCentavos = subtotalCentavos + vatCentavos;
      const balanceCentavos = totalCentavos - withholdingTaxCentavos;

      const invoiceNumber = await generateInvoiceNumber(tx);
      const invoiceDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + client.paymentTermsDays * 86_400_000).toISOString().slice(0, 10);

      const [created] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          jobOrderId,
          clientId: jo.clientId,
          invoiceDate,
          dueDate,
          subtotalCentavos,
          vatCentavos,
          withholdingTaxCentavos,
          totalCentavos,
          amountPaidCentavos: 0,
          balanceCentavos,
          status: "issued",
          createdBy: user.id,
        })
        .returning({ id: invoices.id });

      return created.id;
    });

    const advance = await advanceJobOrderStage(jobOrderId, "invoiced");
    if (advance.error) {
      console.error("Invoice created but JO stage advance failed:", advance.error);
    }

    revalidatePath("/accounting/invoices");
    revalidatePath(`/job-orders/${jobOrderId}`);
    return { success: true, invoiceId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't generate the invoice." };
  }
}

export async function recordPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, ACCOUNTING_WRITE_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const invoiceId = formData.get("invoiceId") as string;
  const amountPesos = Number(formData.get("amountPesos") || 0);
  const paymentDate = (formData.get("paymentDate") as string) || new Date().toISOString().slice(0, 10);
  const method = (formData.get("method") as string) || "bank_transfer";
  const referenceNo = (formData.get("referenceNo") as string) || null;

  if (!invoiceId || amountPesos <= 0) return { error: "Enter a valid payment amount." };
  const amountCentavos = Math.round(amountPesos * 100);

  try {
    let jobOrderId: string | null = null;
    let fullyPaid = false;

    await withUserContext(user.id, async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.balanceCentavos <= 0) throw new Error("This invoice is already fully paid.");

      await tx.insert(payments).values({
        invoiceId,
        clientId: invoice.clientId,
        amountCentavos,
        paymentDate,
        method: method as "cash" | "bank_transfer" | "check" | "gcash" | "maya" | "other",
        referenceNo,
        receivedBy: user.id,
        createdBy: user.id,
      });

      const newAmountPaid = invoice.amountPaidCentavos + amountCentavos;
      const newBalance = invoice.totalCentavos - invoice.withholdingTaxCentavos - newAmountPaid;
      fullyPaid = newBalance <= 0;

      await tx
        .update(invoices)
        .set({
          amountPaidCentavos: newAmountPaid,
          balanceCentavos: newBalance,
          status: fullyPaid ? "paid" : "partially_paid",
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      jobOrderId = invoice.jobOrderId;
    });

    if (fullyPaid && jobOrderId) {
      const advance = await advanceJobOrderStage(jobOrderId, "paid");
      if (advance.error) console.error("Invoice paid but JO stage advance failed:", advance.error);
    }

    revalidatePath("/accounting/invoices");
    if (jobOrderId) revalidatePath(`/job-orders/${jobOrderId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't record the payment." };
  }
}
