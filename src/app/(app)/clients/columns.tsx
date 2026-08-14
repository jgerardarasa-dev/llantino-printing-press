"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import type { ClientListRow } from "@/lib/data/clients";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { formatDate } from "@/lib/format";

const TIER_LABEL: Record<string, string> = {
  standard: "Standard",
  preferred: "Preferred",
  wholesale: "Wholesale",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "warning"> = {
  lead: "outline",
  prospect: "secondary",
  active: "default",
  dormant: "warning",
  lost: "outline",
};

export const clientColumns: ColumnDef<ClientListRow, unknown>[] = [
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <Link href={`/clients/${row.original.id}`} className="font-medium hover:underline">
        {row.original.companyName}
      </Link>
    ),
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => row.original.industry || <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => row.original.city || <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "priceTier",
    header: "Tier",
    cell: ({ row }) => (
      <Badge variant="outline">{TIER_LABEL[row.original.priceTier] ?? row.original.priceTier}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "ownerName",
    header: "Owner",
    cell: ({ row }) => row.original.ownerName || <span className="text-muted-foreground">Unassigned</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Added",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
];

/**
 * Wraps DataTable + clientColumns so the page (a Server Component) only
 * ever passes plain data across the boundary — column definitions carry
 * functions, which can't be passed as a prop from Server to Client (see
 * the nav-icons fix's doc comment for the full rule).
 */
export function ClientsTable({
  data,
  searchPlaceholder,
  emptyState,
}: {
  data: ClientListRow[];
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  return <DataTable columns={clientColumns} data={data} searchPlaceholder={searchPlaceholder} emptyState={emptyState} />;
}
