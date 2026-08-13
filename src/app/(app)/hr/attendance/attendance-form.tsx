"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logAttendance, type ActionState } from "@/lib/actions/attendance-actions";
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

export function AttendanceForm({ employees }: { employees: { id: string; fullName: string; employeeNo: string }[] }) {
  const [state, formAction, isPending] = useActionState(logAttendance, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Attendance logged");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Log attendance</p>
      <div className="space-y-1.5">
        <Label htmlFor="employeeId">Employee</Label>
        <Select name="employeeId">
          <SelectTrigger id="employeeId" className="w-full">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeNo})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs">Date</Label>
          <Input id="date" name="date" type="date" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select name="status" defaultValue="present">
            <SelectTrigger id="status" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="half_day">Half day</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="holiday">Holiday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="timeIn" className="text-xs">Time in</Label>
          <Input id="timeIn" name="timeIn" type="time" className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timeOut" className="text-xs">Time out</Label>
          <Input id="timeOut" name="timeOut" type="time" className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="overtimeHours" className="text-xs">Overtime hours</Label>
        <Input id="overtimeHours" name="overtimeHours" type="number" step="0.25" min={0} defaultValue={0} className="h-8 text-xs" />
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        Log attendance
      </Button>
    </form>
  );
}
