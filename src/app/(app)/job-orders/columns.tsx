"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";

import type { JobOrderListRow } from "@/lib/data/job-orders";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  normal: "outline",
  rush: "warning",
  critical: "destructive",
};

export const jobOrderColumns: ColumnDef<JobOrderListRow, unknown>[] = [
  {
    accessorKey: "joNumber",
    header: "JO #",
    cell: ({ row }) => (
      <Link href={`/job-orders/${row.original.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
        {row.original.isAtRisk && <AlertTriangle className="size-3.5 text-destructive" />}
        {row.original.joNumber}
      </Link>
    ),
  },
  { accessorKey: "clientName", header: "Client", cell: ({ row }) => row.original.clientName || "—" },
  { accessorKey: "boxSpecName", header: "Box spec", cell: ({ row }) => row.original.boxSpecName || "—" },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <StageBadge stage={row.original.stage} />
        {row.original.isOnHold && <Badge variant="warning">On hold</Badge>}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <Badge variant={PRIORITY_VARIANT[row.original.priority] ?? "outline"} className="capitalize">
        {row.original.priority}
      </Badge>
    ),
  },
  {
    id: "quantity",
    header: "Qty (ordered/produced)",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quantityOrdered.toLocaleString()} / {row.original.quantityProduced.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "targetDeliveryDate",
    header: "Target date",
    cell: ({ row }) => (
      <span className={row.original.isAtRisk ? "font-medium text-destructive" : "text-muted-foreground"}>
        {formatDate(row.original.targetDeliveryDate)}
      </span>
    ),
  },
  {
    accessorKey: "totalCentavos",
    header: "Total",
    cell: ({ row }) =>
      row.original.totalCentavos == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="tabular-nums">{formatCentavos(row.original.totalCentavos)}</span>
      ),
  },
  { accessorKey: "productionOwnerName", header: "Production owner", cell: ({ row }) => row.original.productionOwnerName || <span className="text-muted-foreground">Unassigned</span> },
];
