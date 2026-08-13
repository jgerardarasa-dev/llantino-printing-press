"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";

import { withUserContext } from "@/db/client";
import { contacts, quotations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { buildQuotationPdfProps } from "@/lib/pdf/build-quotation-pdf-props";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf";
import { formatCentavos } from "@/lib/format";

export type ActionState = { error?: string; success?: boolean };

/**
 * Sends the quotation PDF to the client's primary contact via Resend.
 * SPEC §7: "Emailable via Resend, and downloadable." Only sent/approved
 * quotations can be emailed — drafts and pending-approval quotes aren't
 * client-facing yet.
 */
export async function emailQuotation(quotationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, CRM_OWNER_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "Email sending isn't configured yet — set RESEND_API_KEY in the environment." };
  }

  const props = await buildQuotationPdfProps(user, quotationId);
  if (!props) return { error: "Quotation not found." };

  const [quotation] = await withUserContext(user.id, async (tx) =>
    tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1)
  );
  if (!quotation) return { error: "Quotation not found." };
  if (!["sent", "approved"].includes(quotation.status)) {
    return { error: "Only sent or approved quotations can be emailed to the client." };
  }
  if (!quotation.clientId) return { error: "This quotation has no client." };

  const recipientContact = await withUserContext(user.id, async (tx) => {
    const rows = await tx
      .select()
      .from(contacts)
      .where(and(eq(contacts.clientId, quotation.clientId!), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.isPrimary));
    return rows.find((c) => c.email) ?? null;
  });

  if (!recipientContact?.email) {
    return { error: "This client has no contact with an email address on file." };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(QuotationPdfDocument(props));
  } catch (e) {
    console.error("PDF render failed", e);
    return { error: "Couldn't generate the PDF." };
  }

  try {
    // Imported dynamically so a missing/invalid RESEND_API_KEY never
    // breaks module evaluation for pages that don't send email.
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: props.company.email || "quotes@resend.dev",
      to: recipientContact.email,
      subject: `Quotation ${props.quotation.quoteNumber} from ${props.company.name}`,
      html: `
        <p>Hi ${recipientContact.name || props.client?.companyName || "there"},</p>
        <p>Please find attached quotation <strong>${props.quotation.quoteNumber}</strong> from ${props.company.name},
        valid until ${new Date(props.quotation.validUntil ?? Date.now()).toLocaleDateString("en-PH")}.</p>
        ${props.item ? `<p>${props.item.description} — ${props.item.quantity.toLocaleString()} pcs at ${formatCentavos(props.item.unitPriceCentavos)} each.</p>` : ""}
        <p>Total: <strong>${formatCentavos(props.totalCentavos)}</strong></p>
        <p>Thank you for the opportunity to quote this job.</p>
      `,
      attachments: [
        { filename: `${props.quotation.quoteNumber}.pdf`, content: pdfBuffer },
      ],
    });

    if (error) {
      console.error("Resend send failed", error);
      return { error: "Resend couldn't send the email. Please try again." };
    }
  } catch (e) {
    console.error("emailQuotation failed", e);
    return { error: "Couldn't send the email. Please try again." };
  }

  return { success: true };
}
