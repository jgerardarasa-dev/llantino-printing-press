import { bucketForDueDate, type AgingBucket } from "@/lib/accounting/aging";
import type { InvoiceListRow } from "@/lib/data/accounting";
import { formatCentavos } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Current",
  "0-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

/** SPEC §8: "Aging receivables (0–30 / 31–60 / 61–90 / 90+)." */
export function AgingSummary({ invoices }: { invoices: InvoiceListRow[] }) {
  const outstanding = invoices.filter((i) => !["paid", "cancelled"].includes(i.status) && i.balanceCentavos > 0);

  const buckets: Record<AgingBucket, number> = { current: 0, "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const inv of outstanding) {
    buckets[bucketForDueDate(inv.dueDate)] += inv.balanceCentavos;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging receivables</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(BUCKET_LABELS) as AgingBucket[]).map((bucket) => (
          <div key={bucket} className={bucket !== "current" && buckets[bucket] > 0 ? "text-destructive" : ""}>
            <p className="text-xs text-muted-foreground">{BUCKET_LABELS[bucket]}</p>
            <p className="text-sm font-semibold tabular-nums">{formatCentavos(buckets[bucket])}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
