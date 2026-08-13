"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveMaterial, type ActionState } from "@/lib/actions/material-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MaterialRow } from "@/lib/data/materials";

const initialState: ActionState = {};

const MATERIAL_TYPES = [
  ["duplex_greyback", "Greyback Duplex"],
  ["duplex_whiteback", "Whiteback Duplex"],
  ["c1s", "C1S"],
  ["c2s", "C2S"],
  ["sbs", "SBS / Ivory"],
  ["kraft", "Kraft"],
  ["corrugated_e", "Corrugated E-flute"],
] as const;

export function MaterialFormSheet({ material, trigger }: { material?: MaterialRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveMaterial, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(material ? "Material updated" : "Material added");
      setOpen(false);
    }
  }, [state.success, material]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> New material
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{material ? "Edit material" : "New material"}</SheetTitle>
          <SheetDescription>Board stock and its per-sheet cost.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="mt-4 flex flex-col gap-4 px-1">
          {material && <input type="hidden" name="id" defaultValue={material.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={material?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={material?.type ?? "duplex_greyback"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gsm">GSM</Label>
              <Input id="gsm" name="gsm" type="number" min={1} defaultValue={material?.gsm ?? 300} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sheetWidthIn">Sheet width (in)</Label>
              <Input id="sheetWidthIn" name="sheetWidthIn" type="number" step="0.01" min={0.01} defaultValue={material?.sheetWidthIn ?? "25.00"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetLengthIn">Sheet length (in)</Label>
              <Input id="sheetLengthIn" name="sheetLengthIn" type="number" step="0.01" min={0.01} defaultValue={material?.sheetLengthIn ?? "38.00"} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="costPerSheetPesos">Cost / sheet (₱)</Label>
              <Input
                id="costPerSheetPesos"
                name="costPerSheetPesos"
                type="number"
                step="0.01"
                min={0.01}
                defaultValue={material ? material.costPerSheetCentavos / 100 : undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderSheets">Min order (sheets)</Label>
              <Input id="minOrderSheets" name="minOrderSheets" type="number" min={0} defaultValue={material?.minOrderSheets ?? 0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input id="supplier" name="supplier" defaultValue={material?.supplier ?? ""} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="isFoodGrade" name="isFoodGrade" defaultChecked={material?.isFoodGrade} />
            <Label htmlFor="isFoodGrade" className="font-normal">Food-grade</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isActive" name="isActive" defaultChecked={material?.isActive ?? true} />
            <Label htmlFor="isActive" className="font-normal">Active (selectable on new box specs)</Label>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SheetFooter className="mt-2 flex-row justify-end gap-2 px-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
