import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { EXPENSE_READ_ROLES } from "@/lib/auth/permissions";
import { listJobCosting } from "@/lib/data/accounting";
import { formatCentavos } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function JobCostingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!EXPENSE_READ_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <BarChart3 className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Job costing is visible to Accounting and Management only.</p>
      </div>
    );
  }

  const rows = await listJobCosting(user);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Job Costing</h1>
        <p className="text-sm text-muted-foreground">
          Quoted cost vs. actual cost for delivered-or-later job orders. Actual = expenses tagged to the JO + materials
          issued, costed at current material rates. Logged labour hours aren&rsquo;t included yet — there&rsquo;s no
          per-operator hourly rate in the data model, so that line would be fabricated rather than computed.
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead>Job order</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Box spec</TableHead>
              <TableHead className="text-right">Quoted cost</TableHead>
              <TableHead className="text-right">Actual cost</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/job-orders/${r.id}`} className="font-medium hover:underline">{r.joNumber}</Link>
                </TableCell>
                <TableCell>{r.clientName ?? "—"}</TableCell>
                <TableCell>{r.boxSpecName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.quotedCostCentavos != null ? formatCentavos(r.quotedCostCentavos) : <span className="text-muted-foreground">No quote</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCentavos(r.actualCostCentavos)}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${r.variancePct != null && r.variancePct > 0 ? "text-destructive" : r.variancePct != null && r.variancePct < 0 ? "text-success-foreground" : ""}`}>
                  {r.variancePct != null ? `${r.variancePct > 0 ? "+" : ""}${r.variancePct}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  No delivered job orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
