"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveProcessRate, type ActionState } from "@/lib/actions/process-rate-actions";
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
import type { ProcessRateRow } from "@/lib/data/materials";

const initialState: ActionState = {};

export function ProcessRateFormSheet({ rate, trigger }: { rate?: ProcessRateRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveProcessRate, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(rate ? "Process rate updated" : "Process rate added");
      setOpen(false);
    }
  }, [state.success, rate]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> New process rate
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{rate ? "Edit process rate" : "New process rate"}</SheetTitle>
          <SheetDescription>Feeds directly into the quotation cost breakdown.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="mt-4 flex flex-col gap-4 px-1">
          {rate && <input type="hidden" name="id" defaultValue={rate.id} />}

          <div className="space-y-2">
            <Label htmlFor="key">Key *</Label>
            <Input
              id="key"
              name="key"
              defaultValue={rate?.key}
              placeholder="e.g. spot_uv"
              required
              readOnly={Boolean(rate)}
              className={rate ? "bg-muted" : undefined}
            />
            {rate && (
              <p className="text-xs text-muted-foreground">
                Keys can&rsquo;t change after creation — box specs and past quotes reference it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input id="label" name="label" defaultValue={rate?.label} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select name="unit" defaultValue={rate?.unit ?? "per_sheet"}>
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_sheet">Per sheet</SelectItem>
                  <SelectItem value="per_piece">Per piece</SelectItem>
                  <SelectItem value="per_plate">Per plate</SelectItem>
                  <SelectItem value="per_job">Per job</SelectItem>
                  <SelectItem value="per_sqin">Per sq. inch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupSheets">Makeready sheets</Label>
              <Input id="setupSheets" name="setupSheets" type="number" min={0} defaultValue={rate?.setupSheets ?? 0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ratePesos">Rate (₱)</Label>
              <Input
                id="ratePesos"
                name="ratePesos"
                type="number"
                step="0.01"
                min={0}
                defaultValue={rate ? rate.rateCentavos / 100 : undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupFeePesos">Setup fee (₱)</Label>
              <Input
                id="setupFeePesos"
                name="setupFeePesos"
                type="number"
                step="0.01"
                min={0}
                defaultValue={rate ? rate.setupFeeCentavos / 100 : 0}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="isActive" name="isActive" defaultChecked={rate?.isActive ?? true} />
            <Label htmlFor="isActive" className="font-normal">Active</Label>
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
