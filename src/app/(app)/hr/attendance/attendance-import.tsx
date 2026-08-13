"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { importAttendanceCsv, type ActionState } from "@/lib/actions/attendance-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function AttendanceImport() {
  const [state, formAction, isPending] = useActionState(importAttendanceCsv, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Attendance imported");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Upload className="size-3.5" /> Bulk import (CSV)
      </p>
      <p className="text-xs text-muted-foreground">
        Header row: <code>employee_no,date,time_in,time_out,status</code>. Times are HH:MM 24h, optional.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="file" className="text-xs">CSV file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
        />
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        Import
      </Button>
    </form>
  );
}
