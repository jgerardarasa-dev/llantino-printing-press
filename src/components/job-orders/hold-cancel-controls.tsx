"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cancelJobOrder, toggleJobOrderHold } from "@/lib/actions/job-order-actions";
import { canCancel } from "@/lib/job-orders/state-machine";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function HoldCancelControls({
  jobOrderId,
  stage,
  isOnHold,
  canManage,
  canCancelOrder,
}: {
  jobOrderId: string;
  stage: JobOrderStage;
  isOnHold: boolean;
  canManage: boolean;
  canCancelOrder: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [holdReason, setHoldReason] = useState("");
  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!canManage || stage === "cancelled" || stage === "closed") return null;

  return (
    <div className="flex gap-2">
      {isOnHold ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await toggleJobOrderHold(jobOrderId, false);
              if (result.error) toast.error(result.error);
              else {
                toast.success("Resumed");
                router.refresh();
              }
            })
          }
        >
          <Play className="size-3.5" /> Resume
        </Button>
      ) : (
        <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pause className="size-3.5" /> Hold
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Put job order on hold</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="holdReason">Reason *</Label>
              <textarea
                id="holdReason"
                rows={2}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHoldOpen(false)}>Cancel</Button>
              <Button
                disabled={!holdReason.trim() || isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await toggleJobOrderHold(jobOrderId, true, holdReason);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success("Job order on hold");
                      setHoldOpen(false);
                      router.refresh();
                    }
                  })
                }
              >
                Put on hold
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canCancelOrder && canCancel(stage) && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <XCircle className="size-3.5" /> Cancel JO
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel job order</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This is terminal — the job order can&rsquo;t be reopened.</p>
            <div className="space-y-1.5">
              <Label htmlFor="cancelReason">Reason *</Label>
              <textarea
                id="cancelReason"
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button
                variant="destructive"
                disabled={!cancelReason.trim() || isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelJobOrder(jobOrderId, cancelReason);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success("Job order cancelled");
                      setCancelOpen(false);
                      router.refresh();
                    }
                  })
                }
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Cancel job order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
