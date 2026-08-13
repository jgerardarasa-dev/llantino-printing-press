"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getClientJobOrdersForRepeat, saveQuotationDraft } from "@/lib/actions/quotation-actions";
import { computeQuote } from "@/lib/pricing/compute-quote";
import { computeQuoteTiers } from "@/lib/pricing/quantity-tiers";
import type { LineOverride, PriceTier, ProcessRateMap, QuoteInput } from "@/lib/pricing/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BreakdownTable } from "./breakdown-table";
import { TierComparisonTable } from "./tier-comparison-table";

type ClientOption = { id: string; companyName: string; priceTier: PriceTier; isVatRegistered: boolean };
type BoxSpecOption = {
  id: string;
  name: string;
  materialId: string | null;
  upsPerSheet: number;
  printColoursFront: number;
  printColoursBack: number;
  hasSpotColour: boolean;
  finishing: string[];
};
type MaterialOption = { id: string; costPerSheetCentavos: number };

export type QuotationBuilderSettings = {
  spoilagePct: number;
  overheadPct: number;
  vatPct: number;
  approvalMarkupFloorPct: number;
  approvalTotalCentavosThreshold: number;
  defaultMarkupPct: Record<PriceTier, number>;
  quotationValidityDays: number;
  companyIsVatRegistered: boolean;
};

export type QuotationBuilderExisting = {
  quotationId: string;
  clientId: string;
  boxSpecId: string;
  printMethod: "offset" | "digital";
  isRepeatOrder: boolean;
  quantity1: number;
  quantity2: number;
  quantity3: number;
  markupPctOverride?: number;
  applyVat: boolean;
  spotColourCount: number;
  leadTimeDays?: number;
  validUntil: string;
  notes: string;
  terms: string;
};

function todayPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function QuotationBuilder({
  clients,
  boxSpecs,
  materials,
  rates,
  settings,
  existing,
}: {
  clients: ClientOption[];
  boxSpecs: BoxSpecOption[];
  materials: MaterialOption[];
  rates: ProcessRateMap;
  settings: QuotationBuilderSettings;
  existing?: QuotationBuilderExisting;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clientId, setClientId] = useState(existing?.clientId ?? "");
  const [boxSpecId, setBoxSpecId] = useState(existing?.boxSpecId ?? "");
  const [printMethod, setPrintMethod] = useState<"offset" | "digital">(existing?.printMethod ?? "offset");
  const [isRepeatOrder, setIsRepeatOrder] = useState(existing?.isRepeatOrder ?? false);
  const [previousJobOrderId, setPreviousJobOrderId] = useState("");
  const [previousJobOrders, setPreviousJobOrders] = useState<
    { id: string; joNumber: string; boxSpecId: string | null; quantityOrdered: number }[]
  >([]);

  const [quantity1, setQuantity1] = useState(String(existing?.quantity1 ?? 1000));
  const [quantity2, setQuantity2] = useState(String(existing?.quantity2 ?? 3000));
  const [quantity3, setQuantity3] = useState(String(existing?.quantity3 ?? 5000));
  const [markupPctOverride, setMarkupPctOverride] = useState(
    existing?.markupPctOverride !== undefined ? String(existing.markupPctOverride) : ""
  );
  const [applyVat, setApplyVat] = useState(existing?.applyVat ?? settings.companyIsVatRegistered);
  const [spotColourCount, setSpotColourCount] = useState(existing?.spotColourCount ?? 0);
  const [leadTimeDays, setLeadTimeDays] = useState(existing?.leadTimeDays ? String(existing.leadTimeDays) : "");
  const [validUntil, setValidUntil] = useState(existing?.validUntil ?? todayPlusDays(settings.quotationValidityDays));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [terms, setTerms] = useState(existing?.terms ?? "");
  const [overrides, setOverrides] = useState<Record<string, LineOverride>>({});

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedBoxSpec = boxSpecs.find((b) => b.id === boxSpecId);
  const selectedMaterial = materials.find((m) => m.id === selectedBoxSpec?.materialId);

  // Fetch the client's past JOs when "repeat order" is toggled on.
  useEffect(() => {
    if (!isRepeatOrder || !clientId) {
      setPreviousJobOrders([]);
      return;
    }
    startTransition(async () => {
      const jos = await getClientJobOrdersForRepeat(clientId);
      setPreviousJobOrders(jos);
    });
  }, [isRepeatOrder, clientId]);

  function handlePickPreviousJo(id: string) {
    setPreviousJobOrderId(id);
    const jo = previousJobOrders.find((j) => j.id === id);
    if (jo?.boxSpecId) setBoxSpecId(jo.boxSpecId);
    if (jo) setQuantity1(String(jo.quantityOrdered));
  }

  const quoteInput = useMemo((): Omit<QuoteInput, "quantity"> | null => {
    if (!selectedBoxSpec || !selectedMaterial || !selectedClient) return null;
    return {
      boxSpec: {
        upsPerSheet: selectedBoxSpec.upsPerSheet,
        printColoursFront: selectedBoxSpec.printColoursFront,
        printColoursBack: selectedBoxSpec.printColoursBack,
        spotColourCount,
        finishing: selectedBoxSpec.finishing,
      },
      material: { costPerSheetCentavos: selectedMaterial.costPerSheetCentavos },
      printMethod,
      isRepeatOrder,
      rates,
      settings: {
        spoilagePct: settings.spoilagePct,
        overheadPct: settings.overheadPct,
        vatPct: settings.vatPct,
        applyVat,
        approvalMarkupFloorPct: settings.approvalMarkupFloorPct,
        approvalTotalCentavosThreshold: settings.approvalTotalCentavosThreshold,
      },
      markupPctOverride: markupPctOverride ? Number(markupPctOverride) : undefined,
      priceTier: selectedClient.priceTier,
      overrides,
    };
  }, [selectedBoxSpec, selectedMaterial, selectedClient, spotColourCount, printMethod, isRepeatOrder, rates, settings, applyVat, markupPctOverride, overrides]);

  const q1 = Number(quantity1) || 0;
  const tiers = useMemo(() => {
    if (!quoteInput || q1 <= 0) return null;
    const q2 = Number(quantity2) || q1;
    const q3 = Number(quantity3) || q1;
    try {
      return computeQuoteTiers(quoteInput, [q1, q2, q3]);
    } catch {
      return null;
    }
  }, [quoteInput, q1, quantity2, quantity3]);

  const primaryBreakdown = useMemo(() => {
    if (!quoteInput || q1 <= 0) return null;
    try {
      return computeQuote({ ...quoteInput, quantity: q1 });
    } catch {
      return null;
    }
  }, [quoteInput, q1]);

  function handleOverrideChange(key: string, override: LineOverride | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (override) next[key] = override;
      else delete next[key];
      return next;
    });
  }

  function handleSave() {
    if (!clientId || !boxSpecId) {
      toast.error("Select a client and a box spec first.");
      return;
    }
    const fd = new FormData();
    if (existing) fd.set("id", existing.quotationId);
    fd.set("clientId", clientId);
    fd.set("boxSpecId", boxSpecId);
    fd.set("printMethod", printMethod);
    fd.set("isRepeatOrder", isRepeatOrder ? "on" : "");
    if (previousJobOrderId) fd.set("previousJobOrderId", previousJobOrderId);
    fd.set("quantity1", quantity1);
    fd.set("quantity2", quantity2 || quantity1);
    fd.set("quantity3", quantity3 || quantity1);
    if (markupPctOverride) fd.set("markupPctOverride", markupPctOverride);
    fd.set("applyVat", applyVat ? "on" : "");
    fd.set("spotColourCount", String(spotColourCount));
    if (leadTimeDays) fd.set("leadTimeDays", leadTimeDays);
    fd.set("validUntil", validUntil);
    fd.set("notes", notes);
    fd.set("terms", terms);
    fd.set("overridesJson", JSON.stringify(overrides));

    startTransition(async () => {
      const result = await saveQuotationDraft({}, fd);
      if (result.error) {
        toast.error(result.error);
      } else if (result.quotationId) {
        toast.success("Quotation saved");
        router.push(`/quotations/${result.quotationId}`);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Client & product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client" className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <p className="text-xs text-muted-foreground">
                  {selectedClient.priceTier} tier · {selectedClient.isVatRegistered ? "VAT-registered" : "Not VAT-registered"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isRepeatOrder"
                checked={isRepeatOrder}
                onCheckedChange={(v) => setIsRepeatOrder(v === true)}
              />
              <Label htmlFor="isRepeatOrder" className="font-normal">
                Repeat order (same design as a past job — no new plates/die)
              </Label>
            </div>

            {isRepeatOrder && (
              <div className="space-y-2">
                <Label htmlFor="previousJo">Previous job order</Label>
                <Select value={previousJobOrderId} onValueChange={handlePickPreviousJo} disabled={!clientId}>
                  <SelectTrigger id="previousJo" className="w-full">
                    <SelectValue placeholder={clientId ? "Select a past JO" : "Select a client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {previousJobOrders.map((jo) => (
                      <SelectItem key={jo.id} value={jo.id}>
                        {jo.joNumber} · {jo.quantityOrdered.toLocaleString()} pcs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="boxSpec">Box spec *</Label>
              <Select value={boxSpecId} onValueChange={setBoxSpecId}>
                <SelectTrigger id="boxSpec" className="w-full">
                  <SelectValue placeholder="Select box spec" />
                </SelectTrigger>
                <SelectContent>
                  {boxSpecs.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="printMethod">Print method</Label>
                <Select value={printMethod} onValueChange={(v) => setPrintMethod(v as "offset" | "digital")}>
                  <SelectTrigger id="printMethod" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offset">Offset</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spotColourCount">Extra spot colours</Label>
                <Input
                  id="spotColourCount"
                  type="number"
                  min={0}
                  value={spotColourCount}
                  onChange={(e) => setSpotColourCount(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantities</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="q1">Quantity (primary)</Label>
              <Input id="q1" type="number" min={1} value={quantity1} onChange={(e) => setQuantity1(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q2">Tier 2</Label>
              <Input id="q2" type="number" min={1} value={quantity2} onChange={(e) => setQuantity2(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q3">Tier 3</Label>
              <Input id="q3" type="number" min={1} value={quantity3} onChange={(e) => setQuantity3(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercial terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="markupPctOverride">
                  Markup % {selectedClient && <span className="text-muted-foreground">(default {settings.defaultMarkupPct[selectedClient.priceTier]}%)</span>}
                </Label>
                <Input
                  id="markupPctOverride"
                  type="number"
                  step="0.1"
                  placeholder={selectedClient ? String(settings.defaultMarkupPct[selectedClient.priceTier]) : ""}
                  value={markupPctOverride}
                  onChange={(e) => setMarkupPctOverride(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead time (days)</Label>
                <Input id="leadTimeDays" type="number" min={0} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="applyVat" checked={applyVat} onCheckedChange={(v) => setApplyVat(v === true)} />
              <Label htmlFor="applyVat" className="font-normal">Apply VAT</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid until</Label>
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (internal)</Label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Terms (shown on PDF)</Label>
              <textarea
                id="terms"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. 50% down payment, balance on delivery. Prices valid until the date above."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" disabled={isPending || !primaryBreakdown} onClick={handleSave}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save draft
        </Button>
      </div>

      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Live breakdown</CardTitle>
            {primaryBreakdown?.requiresApproval && <Badge variant="warning">Needs approval</Badge>}
          </CardHeader>
          <CardContent>
            {primaryBreakdown ? (
              <BreakdownTable breakdown={primaryBreakdown} onOverrideChange={handleOverrideChange} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a client, box spec, and quantity to see the cost breakdown.
              </p>
            )}
          </CardContent>
        </Card>

        {tiers && (
          <Card>
            <CardHeader>
              <CardTitle>Quantity comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <TierComparisonTable tiers={tiers} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
