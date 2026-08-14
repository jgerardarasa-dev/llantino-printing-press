"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { softDeleteMaterial } from "@/lib/actions/material-actions";
import { formatCentavos } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import type { MaterialRow } from "@/lib/data/materials";
import { MaterialFormSheet } from "./material-form-sheet";

const TYPE_LABEL: Record<string, string> = {
  duplex_greyback: "Greyback Duplex",
  duplex_whiteback: "Whiteback Duplex",
  c1s: "C1S",
  c2s: "C2S",
  sbs: "SBS / Ivory",
  kraft: "Kraft",
  corrugated_e: "Corrugated E-flute",
};

function RowActions({ material, canEdit }: { material: MaterialRow; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (!canEdit) return null;

  return (
    <div className="flex justify-end gap-1">
      <MaterialFormSheet
        material={material}
        trigger={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Deactivate ${material.name}?`)) return;
          startTransition(async () => {
            const result = await softDeleteMaterial(material.id);
            if (result.error) toast.error(result.error);
            else toast.success("Material removed");
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function materialsColumns(canEdit: boolean): ColumnDef<MaterialRow, unknown>[] {
  return [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{TYPE_LABEL[row.original.type] ?? row.original.type}</Badge>,
    },
    { accessorKey: "gsm", header: "GSM", cell: ({ row }) => <span className="tabular-nums">{row.original.gsm}</span> },
    {
      id: "sheetSize",
      header: "Sheet size",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.sheetWidthIn}&Prime;×{row.original.sheetLengthIn}&Prime;
        </span>
      ),
    },
    {
      accessorKey: "costPerSheetCentavos",
      header: "Cost / sheet",
      cell: ({ row }) => <span className="tabular-nums">{formatCentavos(row.original.costPerSheetCentavos)}</span>,
    },
    { accessorKey: "supplier", header: "Supplier", cell: ({ row }) => row.original.supplier || <span className="text-muted-foreground">—</span> },
    {
      accessorKey: "isFoodGrade",
      header: "Food-grade",
      cell: ({ row }) => (row.original.isFoodGrade ? <Badge variant="success">Yes</Badge> : <span className="text-muted-foreground">—</span>),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RowActions material={row.original} canEdit={canEdit} />,
    },
  ];
}

/** See ClientsTable's doc comment (clients/columns.tsx) for why this wrapper exists. */
export function MaterialsTable({
  data,
  canEdit,
  searchPlaceholder,
  emptyState,
}: {
  data: MaterialRow[];
  canEdit: boolean;
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  return <DataTable columns={materialsColumns(canEdit)} data={data} searchPlaceholder={searchPlaceholder} emptyState={emptyState} />;
}
