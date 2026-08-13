import { formatCentavos } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QuoteTierResult } from "@/lib/pricing/quantity-tiers";

/**
 * SPEC §7: "compute the same quote at 3 quantities simultaneously ...
 * one-time costs (plates, die) amortise over quantity — the client
 * should see it." Plates/die-making rows are broken out so that's
 * visible, not just implied by a lower unit price.
 */
export function TierComparisonTable({ tiers }: { tiers: QuoteTierResult[] }) {
  const oneTimeKeys = ["plates", "die_making"];
  const oneTimeTotal = (b: QuoteTierResult["breakdown"]) =>
    b.lines.filter((l) => oneTimeKeys.includes(l.key)).reduce((s, l) => s + l.amountCentavos, 0);

  return (
    <div className="rounded-lg border border-border">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Quantity</TableHead>
            {tiers.map((t) => (
              <TableHead key={t.quantity} className="text-right tabular-nums">
                {t.quantity.toLocaleString()} pcs
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground">Plates + die (one-time)</TableCell>
            {tiers.map((t) => (
              <TableCell key={t.quantity} className="text-right tabular-nums text-muted-foreground">
                {formatCentavos(oneTimeTotal(t.breakdown))}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Unit price</TableCell>
            {tiers.map((t) => (
              <TableCell key={t.quantity} className="text-right font-medium tabular-nums">
                {formatCentavos(t.breakdown.unitPriceCentavos)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Grand total</TableCell>
            {tiers.map((t) => (
              <TableCell key={t.quantity} className="text-right font-semibold tabular-nums">
                {formatCentavos(t.breakdown.grandTotalCentavos)}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
