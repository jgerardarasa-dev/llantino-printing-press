import { formatCentavos } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Read-only tier display from the persisted quotation_tiers rows (quantity + unit price only, per schema). */
export function StoredTierTable({ tiers }: { tiers: { quantity: number; unitPriceCentavos: number }[] }) {
  if (tiers.length === 0) return null;
  return (
    <div className="rounded-lg border border-border">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Quantity</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((t) => (
            <TableRow key={t.quantity}>
              <TableCell className="tabular-nums">{t.quantity.toLocaleString()} pcs</TableCell>
              <TableCell className="text-right tabular-nums">{formatCentavos(t.unitPriceCentavos)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCentavos(t.unitPriceCentavos * t.quantity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
