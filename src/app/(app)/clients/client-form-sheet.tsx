"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveClient, type ActionState } from "@/lib/actions/client-actions";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { ClientListRow } from "@/lib/data/clients";

const initialState: ActionState = {};

export function ClientFormSheet({
  owners,
  client,
  trigger,
}: {
  owners: { id: string; fullName: string }[];
  client?: ClientListRow & { addressLine1?: string | null; tin?: string | null; notes?: string | null; creditLimitCentavos?: number | null };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveClient, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(client ? "Client updated" : "Client created");
      setOpen(false);
    }
  }, [state.success, client]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            New client
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{client ? "Edit client" : "New client"}</SheetTitle>
          <SheetDescription>
            {client ? "Update this client's details." : "Add a new client to the CRM."}
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="mt-4 flex flex-col gap-4 px-1">
          {client && <input type="hidden" name="id" defaultValue={client.id} />}

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name *</Label>
            <Input id="companyName" name="companyName" defaultValue={client?.companyName} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tradeName">Trade name</Label>
              <Input id="tradeName" name="tradeName" defaultValue={client?.tradeName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={client?.industry ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={client?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input id="region" name="region" defaultValue={client?.region ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={client?.addressLine1 ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tin">TIN</Label>
            <Input id="tin" name="tin" defaultValue={client?.tin ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priceTier">Price tier</Label>
              <Select name="priceTier" defaultValue={client?.priceTier ?? "standard"}>
                <SelectTrigger id="priceTier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={client?.status ?? "prospect"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerUserId">Account owner *</Label>
            <Select name="ownerUserId" defaultValue={client?.ownerUserId ?? undefined} required>
              <SelectTrigger id="ownerUserId" className="w-full">
                <SelectValue placeholder="Assign an owner" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select name="source" defaultValue="referral">
              <SelectTrigger id="source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="paymentTermsDays">Payment terms (days)</Label>
              <Input
                id="paymentTermsDays"
                name="paymentTermsDays"
                type="number"
                min={0}
                defaultValue={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimitPesos">Credit limit (₱)</Label>
              <Input
                id="creditLimitPesos"
                name="creditLimitPesos"
                type="number"
                min={0}
                step="0.01"
                defaultValue={client?.creditLimitCentavos ? client.creditLimitCentavos / 100 : 0}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isVatRegistered"
              name="isVatRegistered"
              defaultChecked={client?.isVatRegistered}
            />
            <Label htmlFor="isVatRegistered" className="font-normal">
              VAT-registered client
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={client?.notes ?? ""}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <SheetFooter className="mt-2 flex-row justify-end gap-2 px-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
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
