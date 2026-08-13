"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveAdSpend, type ActionState } from "@/lib/actions/ad-spend-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

/** SPEC §8 Meta Ads: "A manual monthly entry form." */
export function AdSpendFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveAdSpend, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Ad spend logged");
      setOpen(false);
    }
  }, [state.success]);

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Log monthly spend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Meta ad spend</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="month">Month *</Label>
              <Input id="month" name="month" type="date" defaultValue={currentMonth} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spendPesos">Spend (₱) *</Label>
              <Input id="spendPesos" name="spendPesos" type="number" step="0.01" min={0.01} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaignName">Campaign name</Label>
            <Input id="campaignName" name="campaignName" placeholder="e.g. August boxes promo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leadsGenerated">Leads generated (platform-reported)</Label>
            <Input id="leadsGenerated" name="leadsGenerated" type="number" min={0} step={1} defaultValue={0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <input type="hidden" name="platform" value="meta" />

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
