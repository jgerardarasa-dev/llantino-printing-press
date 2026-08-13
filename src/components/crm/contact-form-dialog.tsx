"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveContact, type ActionState } from "@/lib/actions/client-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export type ContactRow = {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  mobile: string | null;
  isPrimary: boolean;
};

export function ContactFormDialog({
  clientId,
  contact,
  trigger,
}: {
  clientId: string;
  contact?: ContactRow;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveContact, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(contact ? "Contact updated" : "Contact added");
      setOpen(false);
    }
  }, [state.success, contact]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="size-3.5" />
            Add contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          {contact && <input type="hidden" name="id" value={contact.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={contact?.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Position</Label>
            <Input id="position" name="position" defaultValue={contact?.position ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" name="mobile" defaultValue={contact?.mobile ?? ""} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isPrimary" name="isPrimary" defaultChecked={contact?.isPrimary} />
            <Label htmlFor="isPrimary" className="font-normal">Primary contact</Label>
          </div>

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
