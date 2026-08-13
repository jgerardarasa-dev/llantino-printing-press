"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addHoliday, deleteHoliday, type ActionState } from "@/lib/actions/holiday-actions";
import { formatDate } from "@/lib/format";
import type { HolidayRow } from "@/lib/data/hr";
import { Badge } from "@/components/ui/badge";
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

export function HolidaysPanel({ holidays, canEdit }: { holidays: HolidayRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(addHoliday, initialState);
  const [isDeleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Holiday added");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {canEdit && (
        <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-4 lg:col-span-1">
          <p className="text-sm font-medium">Add holiday</p>
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input id="date" name="date" type="date" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input id="name" name="name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-xs">Type</Label>
            <Select name="type" defaultValue="regular">
              <SelectTrigger id="type" size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular holiday</SelectItem>
                <SelectItem value="special_non_working">Special non-working</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Add
          </Button>
        </form>
      )}

      <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
        <ul className="space-y-1.5">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-muted-foreground">{formatDate(h.date)}</span>
                <span>{h.name}</span>
                <Badge variant="outline" className="capitalize">{h.type.replace(/_/g, " ")}</Badge>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={isDeleting}
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteHoliday(h.id);
                      if (result.error) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
          {holidays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No holidays on record.</p>}
        </ul>
      </div>
    </div>
  );
}
