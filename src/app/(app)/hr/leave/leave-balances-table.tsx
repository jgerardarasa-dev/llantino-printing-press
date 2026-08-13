import type { LeaveBalanceRow } from "@/lib/data/hr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LeaveBalancesTable({ balances }: { balances: LeaveBalanceRow[] }) {
  if (balances.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No leave balances recorded yet — they&rsquo;re created automatically the first time a leave request is approved.</p>;
  }

  return (
    <div className="rounded-lg border border-border">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Entitled</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.employeeName ?? "—"}</TableCell>
              <TableCell className="tabular-nums">{b.year}</TableCell>
              <TableCell className="capitalize">{b.leaveType.replace("_", " ")}</TableCell>
              <TableCell className="text-right tabular-nums">{b.entitledDays}</TableCell>
              <TableCell className="text-right tabular-nums">{b.usedDays}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {(Number(b.entitledDays) - Number(b.usedDays)).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
