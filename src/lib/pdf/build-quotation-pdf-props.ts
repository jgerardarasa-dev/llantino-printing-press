import "server-only";

import { getQuotationDetail } from "@/lib/data/quotations";
import { getSettings } from "@/lib/settings/get-settings";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import type { QuotationPdfProps } from "./quotation-pdf";

export async function buildQuotationPdfProps(
  user: CurrentUser,
  quotationId: string
): Promise<QuotationPdfProps | null> {
  const [detail, settings] = await Promise.all([getQuotationDetail(user, quotationId), getSettings(user)]);
  if (!detail) return null;

  return {
    company: {
      name: settings.companyName,
      address: settings.companyAddress,
      tin: settings.companyTin,
      phone: settings.companyPhone,
      email: settings.companyEmail,
    },
    quotation: {
      quoteNumber: detail.quotation.quoteNumber,
      createdAt: detail.quotation.createdAt,
      validUntil: detail.quotation.validUntil,
      notes: detail.quotation.notes,
      terms: detail.quotation.terms,
      version: detail.quotation.version,
    },
    client: detail.client
      ? {
          companyName: detail.client.companyName,
          addressLine1: detail.client.addressLine1,
          city: detail.client.city,
          tin: detail.client.tin,
        }
      : null,
    item: detail.item
      ? {
          description: detail.item.description,
          quantity: detail.item.quantity,
          unitPriceCentavos: detail.item.unitPriceCentavos,
          lineTotalCentavos: detail.item.lineTotalCentavos,
          leadTimeDays: detail.item.leadTimeDays,
        }
      : null,
    tiers: detail.tiers.map((t) => ({ quantity: t.quantity, unitPriceCentavos: t.unitPriceCentavos })),
    vatCentavos: detail.quotation.vatCentavos,
    totalCentavos: detail.quotation.totalCentavos,
    preparedByName: detail.preparer?.fullName ?? "—",
    approvedByName: detail.approver?.fullName,
  };
}
