"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import type { ExpenseRow } from "@/lib/data/accounting";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const expenseColumns: ColumnDef<ExpenseRow, unknown>[] = [
  { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="font-medium">{row.original.description}</span> },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.category}</Badge>,
  },
  { accessorKey: "vendor", header: "Vendor", cell: ({ row }) => row.original.vendor || "—" },
  {
    accessorKey: "jobOrderId",
    header: "Job order",
    cell: ({ row }) =>
      row.original.jobOrderId ? (
        <Link href={`/job-orders/${row.original.jobOrderId}`} className="text-primary hover:underline">
          {row.original.joNumber}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  { accessorKey: "expenseDate", header: "Date", cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.expenseDate)}</span> },
  { accessorKey: "amountCentavos", header: "Amount", cell: ({ row }) => <span className="tabular-nums font-medium">{formatCentavos(row.original.amountCentavos)}</span> },
  { accessorKey: "recordedByName", header: "Recorded by", cell: ({ row }) => row.original.recordedByName || "—" },
];
