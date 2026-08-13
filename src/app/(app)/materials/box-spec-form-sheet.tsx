"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { saveBoxSpec, type ActionState } from "@/lib/actions/box-spec-actions";
import { suggestUpsPerSheet, type BoxStyle } from "@/lib/pricing/ups-helper";
import { Badge } from "@/components/ui/badge";
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
import type { BoxSpecRow, MaterialRow } from "@/lib/data/materials";

const initialState: ActionState = {};

const STYLES: [BoxStyle, string][] = [
  ["straight_tuck", "Straight Tuck"],
  ["reverse_tuck", "Reverse Tuck"],
  ["auto_lock_bottom", "Auto-Lock Bottom"],
  ["snap_lock", "Snap Lock"],
  ["mailer", "Mailer"],
  ["pizza", "Pizza Box"],
  ["sleeve", "Sleeve"],
  ["tray_lid", "Tray & Lid"],
  ["custom", "Custom"],
];

/** Non-reserved process keys only — plate/printing/die-cut/gluing/packing/stripping have their own dedicated cost steps (see computeQuote). */
const FINISHING_CANDIDATE_KEYS = new Set([
  "lamination_gloss",
  "lamination_matte",
  "spot_uv",
  "foil_stamp",
  "emboss",
  "varnish",
  "window_patching",
  "corner_pasting",
  "drilling",
  "shrink_wrap",
  "quality_inspection",
]);

export function BoxSpecFormSheet({
  materials,
  boxSpec,
  trigger,
}: {
  materials: Pick<MaterialRow, "id" | "name" | "sheetWidthIn" | "sheetLengthIn">[];
  boxSpec?: BoxSpecRow;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveBoxSpec, initialState);

  const [style, setStyle] = useState<BoxStyle>(boxSpec?.style ?? "straight_tuck");
  const [lengthMm, setLengthMm] = useState(boxSpec?.lengthMm ?? "150");
  const [widthMm, setWidthMm] = useState(boxSpec?.widthMm ?? "100");
  const [heightMm, setHeightMm] = useState(boxSpec?.heightMm ?? "60");
  const [materialId, setMaterialId] = useState(boxSpec?.materialId ?? materials[0]?.id ?? "");

  useEffect(() => {
    if (state.success) {
      toast.success(boxSpec ? "Box spec updated" : "Box spec created");
      setOpen(false);
    }
  }, [state.success, boxSpec]);

  const selectedMaterial = materials.find((m) => m.id === materialId);
  const suggestion = useMemo(() => {
    const l = Number(lengthMm);
    const w = Number(widthMm);
    const h = Number(heightMm);
    if (!selectedMaterial || !l || !w || !h) return null;
    return suggestUpsPerSheet({
      style,
      lengthMm: l,
      widthMm: w,
      heightMm: h,
      sheetWidthIn: Number(selectedMaterial.sheetWidthIn),
      sheetLengthIn: Number(selectedMaterial.sheetLengthIn),
    });
  }, [style, lengthMm, widthMm, heightMm, selectedMaterial]);

  const finishingDefaults = new Set((boxSpec?.finishing as string[] | undefined) ?? []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> New box spec
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{boxSpec ? "Edit box spec" : "New box spec"}</SheetTitle>
          <SheetDescription>Reusable box design used to price quotations.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="mt-4 flex flex-col gap-4 px-1">
          {boxSpec && <input type="hidden" name="id" defaultValue={boxSpec.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={boxSpec?.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select name="style" value={style} onValueChange={(v) => setStyle(v as BoxStyle)}>
              <SelectTrigger id="style" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lengthMm">Length (mm)</Label>
              <Input id="lengthMm" name="lengthMm" type="number" step="0.1" value={lengthMm} onChange={(e) => setLengthMm(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="widthMm">Width (mm)</Label>
              <Input id="widthMm" name="widthMm" type="number" step="0.1" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightMm">Height (mm)</Label>
              <Input id="heightMm" name="heightMm" type="number" step="0.1" value={heightMm} onChange={(e) => setHeightMm(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialId">Material *</Label>
            <Select name="materialId" value={materialId} onValueChange={setMaterialId} required>
              <SelectTrigger id="materialId" className="w-full">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="upsPerSheet">Ups per sheet *</Label>
              {suggestion && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => {
                    const input = document.getElementById("upsPerSheet") as HTMLInputElement | null;
                    if (input) input.value = String(suggestion.suggestedUps);
                  }}
                >
                  <Sparkles className="size-3" />
                  Suggest {suggestion.suggestedUps}
                </button>
              )}
            </div>
            <Input
              id="upsPerSheet"
              name="upsPerSheet"
              type="number"
              min={1}
              defaultValue={boxSpec?.upsPerSheet ?? suggestion?.suggestedUps ?? 1}
              required
            />
            {suggestion && (
              <p className="text-xs text-muted-foreground">
                Rough estimate from a {suggestion.flatBlankWidthMm}×{suggestion.flatBlankHeightMm}mm flat blank
                vs. the sheet size, minus a 10mm gripper margin. Not true imposition — accept or override.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="printColoursFront">Print colours — front</Label>
              <Input id="printColoursFront" name="printColoursFront" type="number" min={0} defaultValue={boxSpec?.printColoursFront ?? 4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printColoursBack">Print colours — back</Label>
              <Input id="printColoursBack" name="printColoursBack" type="number" min={0} defaultValue={boxSpec?.printColoursBack ?? 0} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="hasSpotColour" name="hasSpotColour" defaultChecked={boxSpec?.hasSpotColour} />
            <Label htmlFor="hasSpotColour" className="font-normal">Has spot / Pantone colour</Label>
          </div>

          <div className="space-y-2">
            <Label>Finishing</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
              {[...FINISHING_CANDIDATE_KEYS].map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox name="finishing" value={key} defaultChecked={finishingDefaults.has(key)} />
                  {key.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="isFoodGrade" name="isFoodGrade" defaultChecked={boxSpec?.isFoodGrade} />
            <Label htmlFor="isFoodGrade" className="font-normal">Food-grade</Label>
          </div>

          {selectedMaterial && (
            <Badge variant="outline" className="w-fit">
              Sheet: {selectedMaterial.sheetWidthIn}&Prime;×{selectedMaterial.sheetLengthIn}&Prime;
            </Badge>
          )}

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
