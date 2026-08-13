import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { StageBadge } from "@/components/shared/stage-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentavos, formatRelativeDays } from "@/lib/format";
import type { JobOrderListRow } from "@/lib/data/job-orders";

/** SPEC §8: "At-risk jobs table: JOs whose target date is near and stage is behind — sorted by urgency, red." */
export function AtRiskTable({ rows }: { rows: JobOrderListRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No at-risk job orders right now.</p>;
  }

  return (
    <div className="rounded-lg border border-destructive/30">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Job order</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Target date</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="bg-destructive/5">
              <TableCell>
                <Link href={`/job-orders/${r.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
                  <AlertTriangle className="size-3.5 text-destructive" />
                  {r.joNumber}
                </Link>
              </TableCell>
              <TableCell>{r.clientName ?? "—"}</TableCell>
              <TableCell>
                <StageBadge stage={r.stage} />
              </TableCell>
              <TableCell className="text-destructive">{formatRelativeDays(r.targetDeliveryDate)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCentavos(r.totalCentavos)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
