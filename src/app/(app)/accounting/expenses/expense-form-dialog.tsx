"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveExpense, type ActionState } from "@/lib/actions/expense-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = {};

export function ExpenseFormDialog({ jobOrders }: { jobOrders: { id: string; joNumber: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveExpense, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Expense recorded");
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record expense</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Input id="description" name="description" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue="materials">
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="salaries">Salaries</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amountPesos">Amount (₱) *</Label>
              <Input id="amountPesos" name="amountPesos" type="number" step="0.01" min={0.01} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" name="vendor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expenseDate">Date *</Label>
              <Input id="expenseDate" name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Payment method</Label>
              <Select name="paymentMethod" defaultValue="cash">
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobOrderId">Tag to job order</Label>
              <Select name="jobOrderId">
                <SelectTrigger id="jobOrderId" className="w-full">
                  <SelectValue placeholder="Not job-specific" />
                </SelectTrigger>
                <SelectContent>
                  {jobOrders.map((jo) => (
                    <SelectItem key={jo.id} value={jo.id}>{jo.joNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
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
