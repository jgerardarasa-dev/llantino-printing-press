"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { bucketForDueDate } from "@/lib/accounting/aging";
import type { InvoiceListRow } from "@/lib/data/accounting";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "warning" | "success" | "destructive"> = {
  draft: "outline",
  issued: "secondary",
  partially_paid: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "outline",
};

export const invoiceColumns: ColumnDef<InvoiceListRow, unknown>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => (
      <Link href={`/accounting/invoices/${row.original.id}`} className="font-medium hover:underline">
        {row.original.invoiceNumber}
      </Link>
    ),
  },
  { accessorKey: "clientName", header: "Client", cell: ({ row }) => row.original.clientName || "—" },
  { accessorKey: "joNumber", header: "Job order", cell: ({ row }) => row.original.joNumber || "—" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const isOverdue = row.original.balanceCentavos > 0 && bucketForDueDate(row.original.dueDate) !== "current" && row.original.status !== "paid";
      const status = isOverdue ? "overdue" : row.original.status;
      return <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">{status.replace("_", " ")}</Badge>;
    },
  },
  { accessorKey: "invoiceDate", header: "Date", cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.invoiceDate)}</span> },
  { accessorKey: "dueDate", header: "Due", cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.dueDate)}</span> },
  { accessorKey: "totalCentavos", header: "Total", cell: ({ row }) => <span className="tabular-nums">{formatCentavos(row.original.totalCentavos)}</span> },
  { accessorKey: "balanceCentavos", header: "Balance", cell: ({ row }) => <span className="tabular-nums font-medium">{formatCentavos(row.original.balanceCentavos)}</span> },
];

/** See ClientsTable's doc comment (clients/columns.tsx) for why this wrapper exists. */
export function InvoicesTable({
  data,
  searchPlaceholder,
  emptyState,
}: {
  data: InvoiceListRow[];
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  return <DataTable columns={invoiceColumns} data={data} searchPlaceholder={searchPlaceholder} emptyState={emptyState} />;
}
