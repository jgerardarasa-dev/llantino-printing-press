"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

import { createDelivery, markDelivered, type ActionState } from "@/lib/actions/delivery-actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export type DeliveryRow = {
  id: string;
  drNumber: string;
  scheduledDate: string | null;
  deliveredAt: string | Date | null;
  quantity: number;
  receivedByName: string | null;
  driverName: string | null;
  status: string;
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  scheduled: "outline",
  out_for_delivery: "secondary",
  delivered: "success",
  failed: "destructive",
  cancelled: "outline",
};

export function DeliveriesPanel({
  jobOrderId,
  deliveries,
  canEdit,
}: {
  jobOrderId: string;
  deliveries: DeliveryRow[];
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(createDelivery, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Delivery scheduled");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {deliveries.map((d) => (
          <li key={d.id} className="rounded-md border border-border p-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.drNumber}</span>
              <Badge variant={STATUS_VARIANT[d.status] ?? "outline"} className="capitalize">
                {d.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {d.quantity.toLocaleString()} pcs · scheduled {formatDate(d.scheduledDate)}
              {d.deliveredAt && ` · delivered ${formatDate(d.deliveredAt)}`}
              {d.receivedByName && ` · received by ${d.receivedByName}`}
            </p>
            <div className="mt-1.5 flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <a href={`/deliveries/${d.id}/pdf`} target="_blank" rel="noreferrer">DR PDF</a>
              </Button>
              {canEdit && d.status !== "delivered" && <MarkDeliveredButton deliveryId={d.id} jobOrderId={jobOrderId} />}
            </div>
          </li>
        ))}
        {deliveries.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No deliveries scheduled yet.</p>}
      </ul>

      {canEdit && (
        <form ref={formRef} action={formAction} className="space-y-2 rounded-lg border border-border p-3">
          <input type="hidden" name="jobOrderId" value={jobOrderId} />
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Truck className="size-3.5" /> Schedule delivery
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="scheduledDate" className="text-xs">Scheduled date</Label>
              <Input id="scheduledDate" name="scheduledDate" type="date" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity" className="text-xs">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" min={1} required className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="driverName" className="text-xs">Driver</Label>
              <Input id="driverName" name="driverName" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vehicle" className="text-xs">Vehicle</Label>
              <Input id="vehicle" name="vehicle" className="h-8 text-xs" />
            </div>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Schedule
          </Button>
        </form>
      )}
    </div>
  );
}

function MarkDeliveredButton({ deliveryId, jobOrderId }: { deliveryId: string; jobOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [receivedByName, setReceivedByName] = useState("");
  const [deliveredAt, setDeliveredAt] = useState(() => new Date().toISOString().slice(0, 16));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
        Mark delivered
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark delivered</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="receivedByName">Received by *</Label>
          <Input id="receivedByName" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliveredAt">Delivered at</Label>
          <Input id="deliveredAt" type="datetime-local" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!receivedByName.trim() || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await markDelivered(deliveryId, jobOrderId, { receivedByName, deliveredAt });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Marked delivered");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
