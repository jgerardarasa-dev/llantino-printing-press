import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { listClients } from "@/lib/data/clients";
import { getProcessRatesMap, listBoxSpecs, listMaterials } from "@/lib/data/materials";
import { getQuotationDetail } from "@/lib/data/quotations";
import { getSettings } from "@/lib/settings/get-settings";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";
import type { QuoteBreakdown } from "@/lib/pricing/types";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!CRM_OWNER_ROLES.includes(user.role)) redirect(`/quotations/${id}`);

  const detail = await getQuotationDetail(user, id);
  if (!detail) notFound();
  if (!["draft", "rejected"].includes(detail.quotation.status)) {
    redirect(`/quotations/${id}`);
  }
  if (!detail.item || !detail.quotation.clientId) {
    redirect(`/quotations/${id}`);
  }

  const [clients, boxSpecs, materials, rates, settings] = await Promise.all([
    listClients(user),
    listBoxSpecs(user),
    listMaterials(user),
    getProcessRatesMap(user),
    getSettings(user),
  ]);

  const breakdown = detail.item.costBreakdown as QuoteBreakdown;
  // printMethod and applyVat are cleanly derivable from the stored
  // breakdown; isRepeatOrder and spotColourCount aren't (both offset-
  // repeat-orders and any digital job omit the "plates" line, so it
  // can't be reverse-engineered reliably) — they reset to sensible
  // defaults on edit and are quick for the estimator to re-set.
  const printingLine = breakdown.lines.find((l) => l.key === "printing");
  const printMethod: "offset" | "digital" = printingLine?.label === "Digital printing" ? "digital" : "offset";
  const applyVat = breakdown.vatCentavos > 0;
  const tierQuantities = detail.tiers.map((t) => t.quantity);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href={`/quotations/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {detail.quotation.quoteNumber}
      </Link>
      <h1 className="text-lg font-semibold">Edit quotation</h1>

      <QuotationBuilder
        clients={clients.map((c) => ({ id: c.id, companyName: c.companyName, priceTier: c.priceTier, isVatRegistered: c.isVatRegistered }))}
        boxSpecs={boxSpecs.map((b) => ({
          id: b.id,
          name: b.name,
          materialId: b.materialId,
          upsPerSheet: b.upsPerSheet,
          printColoursFront: b.printColoursFront,
          printColoursBack: b.printColoursBack,
          hasSpotColour: b.hasSpotColour,
          finishing: (b.finishing as string[]) ?? [],
        }))}
        materials={materials.map((m) => ({ id: m.id, costPerSheetCentavos: m.costPerSheetCentavos }))}
        rates={rates}
        settings={{
          spoilagePct: settings.spoilagePct,
          overheadPct: settings.overheadPct,
          vatPct: settings.vatPct,
          approvalMarkupFloorPct: settings.approvalMarkupFloorPct,
          approvalTotalCentavosThreshold: settings.approvalTotalCentavosThreshold,
          defaultMarkupPct: settings.defaultMarkupPct,
          quotationValidityDays: settings.quotationValidityDays,
          companyIsVatRegistered: settings.companyIsVatRegistered,
        }}
        existing={{
          quotationId: detail.quotation.id,
          clientId: detail.quotation.clientId,
          boxSpecId: detail.item.boxSpecId ?? "",
          printMethod,
          isRepeatOrder: false,
          quantity1: tierQuantities[0] ?? detail.item.quantity,
          quantity2: tierQuantities[1] ?? detail.item.quantity,
          quantity3: tierQuantities[2] ?? detail.item.quantity,
          markupPctOverride: breakdown.markupPct,
          applyVat,
          spotColourCount: 0,
          leadTimeDays: detail.item.leadTimeDays ?? undefined,
          validUntil: detail.quotation.validUntil
            ? new Date(detail.quotation.validUntil).toISOString().slice(0, 10)
            : "",
          notes: detail.quotation.notes ?? "",
          terms: detail.quotation.terms ?? "",
        }}
      />
    </div>
  );
}
