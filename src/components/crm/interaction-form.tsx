"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logInteraction, type ActionState } from "@/lib/actions/interaction-actions";
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

const initialState: ActionState = {};

function nowLocalDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function InteractionForm({ clientId, leadId }: { clientId?: string; leadId?: string }) {
  const [state, formAction, isPending] = useActionState(logInteraction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Interaction logged");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-3">
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      {leadId && <input type="hidden" name="leadId" value={leadId} />}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-xs">Type</Label>
          <Select name="type" defaultValue="call">
            <SelectTrigger id="type" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="site_visit">Site visit</SelectItem>
              <SelectItem value="messenger">Messenger</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occurredAt" className="text-xs">When</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={nowLocalDatetime()}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary" className="text-xs">Summary</Label>
        <textarea
          id="summary"
          name="summary"
          required
          rows={2}
          placeholder="What happened?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="nextAction" className="text-xs">Next action</Label>
          <Input id="nextAction" name="nextAction" className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nextActionDate" className="text-xs">Next action date</Label>
          <Input id="nextActionDate" name="nextActionDate" type="date" className="h-8 text-xs" />
        </div>
      </div>

      {state.error && <p className="text-xs text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Log interaction
        </Button>
      </div>
    </form>
  );
}
