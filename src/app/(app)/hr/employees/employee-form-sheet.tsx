"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveEmployee, type ActionState } from "@/lib/actions/employee-actions";
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
import type { EmployeeRow } from "@/lib/data/hr";

const initialState: ActionState = {};

export function EmployeeFormSheet({
  users,
  employee,
  trigger,
}: {
  users: { id: string; fullName: string }[];
  employee?: EmployeeRow;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveEmployee, initialState);
  const existingRate = employee?.dailyRateCentavos ?? employee?.monthlyRateCentavos ?? null;
  const existingRateType = employee?.monthlyRateCentavos ? "monthly" : "daily";

  useEffect(() => {
    if (state.success) {
      toast.success(employee ? "Employee updated" : "Employee added");
      setOpen(false);
    }
  }, [state.success, employee]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> New employee
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{employee ? "Edit employee" : "New employee"}</SheetTitle>
          <SheetDescription>HR captures inputs only — no payroll computation.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="mt-4 flex flex-col gap-4 px-1">
          {employee && <input type="hidden" name="id" defaultValue={employee.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="employeeNo">Employee # *</Label>
              <Input id="employeeNo" name="employeeNo" defaultValue={employee?.employeeNo} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" name="fullName" defaultValue={employee?.fullName} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" defaultValue={employee?.position ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" defaultValue={employee?.department ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment type</Label>
              <Select name="employmentType" defaultValue={employee?.employmentType ?? "probationary"}>
                <SelectTrigger id="employmentType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="probationary">Probationary</SelectItem>
                  <SelectItem value="contractual">Contractual</SelectItem>
                  <SelectItem value="project">Project-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={employee?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="awol">AWOL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateHired">Date hired *</Label>
              <Input id="dateHired" name="dateHired" type="date" defaultValue={employee?.dateHired ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateRegularized">Date regularized</Label>
              <Input id="dateRegularized" name="dateRegularized" type="date" defaultValue={employee?.dateRegularized ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rateType">Rate type</Label>
              <Select name="rateType" defaultValue={existingRateType}>
                <SelectTrigger id="rateType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratePesos">Rate (₱)</Label>
              <Input id="ratePesos" name="ratePesos" type="number" step="0.01" min={0} defaultValue={existingRate ? existingRate / 100 : undefined} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">Linked login account</Label>
            <Select name="userId" defaultValue={employee?.userId ?? undefined}>
              <SelectTrigger id="userId" className="w-full">
                <SelectValue placeholder="No login access" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sssNo">SSS #</Label>
              <Input id="sssNo" name="sssNo" defaultValue={employee?.sssNo ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealthNo">PhilHealth #</Label>
              <Input id="philhealthNo" name="philhealthNo" defaultValue={employee?.philhealthNo ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pagibigNo">Pag-IBIG #</Label>
              <Input id="pagibigNo" name="pagibigNo" defaultValue={employee?.pagibigNo ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tin">TIN</Label>
              <Input id="tin" name="tin" defaultValue={employee?.tin ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency contact</Label>
            <Input
              id="emergencyContact"
              name="emergencyContact"
              placeholder="Name · relationship · phone"
              defaultValue={employee?.emergencyContact ?? ""}
            />
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
