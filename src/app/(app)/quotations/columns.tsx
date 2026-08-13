"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import type { QuotationListRow } from "@/lib/data/quotations";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive" | "success"> = {
  draft: "outline",
  pending_approval: "warning",
  sent: "secondary",
  revised: "outline",
  approved: "success",
  rejected: "destructive",
  expired: "outline",
};

export const quotationColumns: ColumnDef<QuotationListRow, unknown>[] = [
  {
    accessorKey: "quoteNumber",
    header: "Quote #",
    cell: ({ row }) => (
      <Link href={`/quotations/${row.original.id}`} className="font-medium hover:underline">
        {row.original.quoteNumber}
      </Link>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => row.original.clientName || <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const isExpired = row.original.validUntil && new Date(row.original.validUntil) < new Date() && ["sent", "approved"].includes(row.original.status);
      const status = isExpired ? "expired" : row.original.status;
      return (
        <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">
          {status.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "version",
    header: "Ver.",
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">v{row.original.version}</span>,
  },
  {
    accessorKey: "totalCentavos",
    header: "Total",
    cell: ({ row }) => <span className="tabular-nums">{formatCentavos(row.original.totalCentavos)}</span>,
  },
  {
    accessorKey: "validUntil",
    header: "Valid until",
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.validUntil)}</span>,
  },
  { accessorKey: "preparedByName", header: "Prepared by" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
  },
];
