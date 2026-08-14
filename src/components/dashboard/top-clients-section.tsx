import Link from "next/link";

import { DateRangeForm } from "@/components/dashboard/date-range-form";
import { CsvExportButton } from "@/components/shared/csv-export-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCsv } from "@/lib/csv";
import { formatCentavos } from "@/lib/format";
import type { TopClient } from "@/lib/data/dashboard";

/** SPEC §8: "Top 10 clients by revenue (period selectable)." */
export function TopClientsSection({ rows, from, to }: { rows: TopClient[]; from: string; to: string }) {
  const csv = buildCsv(rows, [
    { header: "Client", accessor: (r) => r.clientName ?? "Unspecified" },
    { header: "Revenue (PHP)", accessor: (r) => (r.revenueCentavos / 100).toFixed(2) },
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateRangeForm action="/dashboard" from={from} to={to} />
        <CsvExportButton csv={csv} filename={`top-clients-${from}-to-${to}.csv`} />
      </div>
      <div className="rounded-lg border border-border">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-20 text-center text-sm text-muted-foreground">
                  No invoiced revenue in this period.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.clientId ?? "unspecified"}>
                  <TableCell>
                    {r.clientId ? (
                      <Link href={`/clients/${r.clientId}`} className="font-medium hover:underline">
                        {r.clientName ?? "Unspecified"}
                      </Link>
                    ) : (
                      r.clientName ?? "Unspecified"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCentavos(r.revenueCentavos)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
