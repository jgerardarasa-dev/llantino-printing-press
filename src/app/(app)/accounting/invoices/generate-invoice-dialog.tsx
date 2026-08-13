"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { generateInvoiceFromJobOrder, type ActionState } from "@/lib/actions/invoice-actions";
import { formatCentavos, formatDate } from "@/lib/format";
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

type Candidate = { id: string; joNumber: string; clientName: string | null; totalCentavos: number | null; actualDeliveryDate: string | null };

export function GenerateInvoiceDialog({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(generateInvoiceFromJobOrder, initialState);

  useEffect(() => {
    if (state.success && state.invoiceId) {
      toast.success("Invoice generated");
      setOpen(false);
      router.push(`/accounting/invoices/${state.invoiceId}`);
    }
  }, [state.success, state.invoiceId, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={candidates.length === 0}>
          <Plus className="size-4" /> Generate invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate invoice</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="jobOrderId">Delivered job order *</Label>
            <Select name="jobOrderId" required>
              <SelectTrigger id="jobOrderId" className="w-full">
                <SelectValue placeholder="Select a delivered job order" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.joNumber} · {c.clientName ?? "—"} · {formatCentavos(c.totalCentavos)} · delivered {formatDate(c.actualDeliveryDate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="withholdingTaxPesos">Withholding tax (₱, optional)</Label>
            <Input id="withholdingTaxPesos" name="withholdingTaxPesos" type="number" step="0.01" min={0} defaultValue={0} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
