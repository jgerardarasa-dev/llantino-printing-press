"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { softDeleteProcessRate } from "@/lib/actions/process-rate-actions";
import { formatCentavos } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProcessRateRow } from "@/lib/data/materials";
import { ProcessRateFormSheet } from "./process-rate-form-sheet";

const UNIT_LABEL: Record<string, string> = {
  per_sheet: "per sheet",
  per_piece: "per piece",
  per_plate: "per plate",
  per_job: "per job",
  per_sqin: "per sq. in",
};

function RowActions({ rate, canEdit }: { rate: ProcessRateRow; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (!canEdit) return null;

  return (
    <div className="flex justify-end gap-1">
      <ProcessRateFormSheet
        rate={rate}
        trigger={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Deactivate "${rate.label}"? Existing quotes keep their frozen snapshot.`)) return;
          startTransition(async () => {
            const result = await softDeleteProcessRate(rate.id);
            if (result.error) toast.error(result.error);
            else toast.success("Process rate removed");
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function processRatesColumns(canEdit: boolean): ColumnDef<ProcessRateRow, unknown>[] {
  return [
    { accessorKey: "key", header: "Key", cell: ({ row }) => <code className="text-xs">{row.original.key}</code> },
    { accessorKey: "label", header: "Label", cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => <Badge variant="outline">{UNIT_LABEL[row.original.unit] ?? row.original.unit}</Badge>,
    },
    {
      accessorKey: "rateCentavos",
      header: "Rate",
      cell: ({ row }) => <span className="tabular-nums">{formatCentavos(row.original.rateCentavos)}</span>,
    },
    {
      accessorKey: "setupFeeCentavos",
      header: "Setup fee",
      cell: ({ row }) => <span className="tabular-nums">{formatCentavos(row.original.setupFeeCentavos)}</span>,
    },
    {
      accessorKey: "setupSheets",
      header: "Makeready sheets",
      cell: ({ row }) => <span className="tabular-nums">{row.original.setupSheets || "—"}</span>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (row.original.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RowActions rate={row.original} canEdit={canEdit} />,
    },
  ];
}
