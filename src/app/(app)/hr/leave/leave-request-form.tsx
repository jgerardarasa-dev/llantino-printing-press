"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { fileLeaveRequest, type ActionState } from "@/lib/actions/leave-actions";
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

export function LeaveRequestForm({
  employees,
  ownEmployeeId,
  canFileForOthers,
}: {
  employees: { id: string; fullName: string }[];
  ownEmployeeId: string | null;
  canFileForOthers: boolean;
}) {
  const [state, formAction, isPending] = useActionState(fileLeaveRequest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Leave request filed");
      formRef.current?.reset();
    }
  }, [state.success]);

  if (!canFileForOthers && !ownEmployeeId) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        You don&rsquo;t have an employee record linked to your login yet — ask HR to link one before you can file leave.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">File leave</p>

      {canFileForOthers ? (
        <div className="space-y-1.5">
          <Label htmlFor="employeeId" className="text-xs">Employee</Label>
          <Select name="employeeId" defaultValue={ownEmployeeId ?? undefined}>
            <SelectTrigger id="employeeId" size="sm" className="w-full">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <input type="hidden" name="employeeId" value={ownEmployeeId!} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="leaveType" className="text-xs">Leave type</Label>
        <Select name="leaveType" defaultValue="vacation">
          <SelectTrigger id="leaveType" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="sick">Sick</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="maternity">Maternity</SelectItem>
            <SelectItem value="paternity">Paternity</SelectItem>
            <SelectItem value="solo_parent">Solo parent</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate" className="text-xs">Start</Label>
          <Input id="startDate" name="startDate" type="date" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate" className="text-xs">End</Label>
          <Input id="endDate" name="endDate" type="date" className="h-8 text-xs" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason" className="text-xs">Reason</Label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        File leave request
      </Button>
    </form>
  );
}
