"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { softDeleteBoxSpec } from "@/lib/actions/box-spec-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import type { BoxSpecRow, MaterialRow } from "@/lib/data/materials";
import { BoxSpecFormSheet } from "./box-spec-form-sheet";

const STYLE_LABEL: Record<string, string> = {
  straight_tuck: "Straight Tuck",
  reverse_tuck: "Reverse Tuck",
  auto_lock_bottom: "Auto-Lock Bottom",
  snap_lock: "Snap Lock",
  mailer: "Mailer",
  pizza: "Pizza Box",
  sleeve: "Sleeve",
  tray_lid: "Tray & Lid",
  custom: "Custom",
};

function RowActions({
  boxSpec,
  materials,
  canEdit,
}: {
  boxSpec: BoxSpecRow;
  materials: Pick<MaterialRow, "id" | "name" | "sheetWidthIn" | "sheetLengthIn">[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  if (!canEdit) return null;

  return (
    <div className="flex justify-end gap-1">
      <BoxSpecFormSheet
        materials={materials}
        boxSpec={boxSpec}
        trigger={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Delete box spec "${boxSpec.name}"?`)) return;
          startTransition(async () => {
            const result = await softDeleteBoxSpec(boxSpec.id);
            if (result.error) toast.error(result.error);
            else toast.success("Box spec removed");
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function boxSpecsColumns(
  materials: Pick<MaterialRow, "id" | "name" | "sheetWidthIn" | "sheetLengthIn">[],
  canEdit: boolean
): ColumnDef<BoxSpecRow, unknown>[] {
  return [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      accessorKey: "style",
      header: "Style",
      cell: ({ row }) => <Badge variant="outline">{STYLE_LABEL[row.original.style] ?? row.original.style}</Badge>,
    },
    {
      id: "dimensions",
      header: "Dimensions (mm)",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.lengthMm}×{row.original.widthMm}×{row.original.heightMm}
        </span>
      ),
    },
    { accessorKey: "materialName", header: "Material", cell: ({ row }) => row.original.materialName || "—" },
    {
      id: "colours",
      header: "Colours",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.printColoursFront}/{row.original.printColoursBack}
          {row.original.hasSpotColour && "+S"}
        </span>
      ),
    },
    {
      accessorKey: "upsPerSheet",
      header: "Ups",
      cell: ({ row }) => <span className="tabular-nums">{row.original.upsPerSheet}</span>,
    },
    {
      accessorKey: "isFoodGrade",
      header: "Food-grade",
      cell: ({ row }) => (row.original.isFoodGrade ? <Badge variant="success">Yes</Badge> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RowActions boxSpec={row.original} materials={materials} canEdit={canEdit} />,
    },
  ];
}

/** See ClientsTable's doc comment (clients/columns.tsx) for why this wrapper exists. */
export function BoxSpecsTable({
  data,
  materials,
  canEdit,
  searchPlaceholder,
  emptyState,
}: {
  data: BoxSpecRow[];
  materials: Pick<MaterialRow, "id" | "name" | "sheetWidthIn" | "sheetLengthIn">[];
  canEdit: boolean;
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  return <DataTable columns={boxSpecsColumns(materials, canEdit)} data={data} searchPlaceholder={searchPlaceholder} emptyState={emptyState} />;
}
