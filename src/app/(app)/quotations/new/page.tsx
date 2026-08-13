import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { listClients } from "@/lib/data/clients";
import { getProcessRatesMap, listBoxSpecs, listMaterials } from "@/lib/data/materials";
import { getSettings } from "@/lib/settings/get-settings";
import { QuotationBuilder } from "@/components/quotations/quotation-builder";

export default async function NewQuotationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!CRM_OWNER_ROLES.includes(user.role)) redirect("/quotations");

  const [clients, boxSpecs, materials, rates, settings] = await Promise.all([
    listClients(user),
    listBoxSpecs(user),
    listMaterials(user),
    getProcessRatesMap(user),
    getSettings(user),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href="/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Quotations
      </Link>
      <h1 className="text-lg font-semibold">New quotation</h1>

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
      />
    </div>
  );
}
