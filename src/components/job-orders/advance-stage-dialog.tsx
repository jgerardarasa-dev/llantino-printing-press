"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { advanceJobOrderStage } from "@/lib/actions/job-order-actions";
import { STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { nextStage, previousStage } from "@/lib/job-orders/state-machine";
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

export function AdvanceStageDialog({
  open,
  onOpenChange,
  jobOrderId,
  currentStage,
  clientPoNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrderId: string;
  currentStage: JobOrderStage;
  clientPoNumber: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"forward" | "backward">("forward");
  const [note, setNote] = useState("");
  const [poNumber, setPoNumber] = useState(clientPoNumber ?? "");
  const [approverName, setApproverName] = useState("");
  const [approvalDate, setApprovalDate] = useState("");

  const next = nextStage(currentStage);
  const previous = previousStage(currentStage);
  const target = mode === "forward" ? next : previous;

  const needsPoNumber = currentStage === "draft" && next === "for_artwork" && !clientPoNumber;
  const needsProofApproval = currentStage === "artwork_approval" && next === "prepress";
  const isQcGate = currentStage === "quality_check" && next === "packing";
  const isDeliveryGate = currentStage === "delivered" && next === "invoiced";

  function handleSubmit() {
    if (!target) return;
    if (mode === "backward" && !note.trim()) {
      toast.error("A note is required when sending a job order back for rework.");
      return;
    }
    if (needsPoNumber && mode === "forward" && !poNumber.trim()) {
      toast.error("Enter the client PO number.");
      return;
    }
    if (needsProofApproval && mode === "forward" && (!approverName.trim() || !approvalDate)) {
      toast.error("Record who approved the proof and when.");
      return;
    }

    const composedNote =
      mode === "forward" && needsProofApproval
        ? `Client approval: ${approverName} on ${approvalDate}`
        : note || undefined;

    startTransition(async () => {
      const result = await advanceJobOrderStage(jobOrderId, target, {
        note: composedNote,
        hasProofApproval: needsProofApproval ? Boolean(approverName.trim() && approvalDate) : undefined,
        clientPoNumber: needsPoNumber ? poNumber : undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(mode === "forward" ? "Stage advanced" : "Sent back for rework");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Advance job order</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {next && (
            <Button
              type="button"
              variant={mode === "forward" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("forward")}
              className="flex-1"
            >
              <ArrowRight className="size-3.5" /> {STAGE_LABELS[next]}
            </Button>
          )}
          {previous && (
            <Button
              type="button"
              variant={mode === "backward" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("backward")}
              className="flex-1"
            >
              <ArrowLeft className="size-3.5" /> Rework: {STAGE_LABELS[previous]}
            </Button>
          )}
        </div>

        {mode === "forward" && needsPoNumber && (
          <div className="space-y-1.5">
            <Label htmlFor="poNumber">Client PO number *</Label>
            <Input id="poNumber" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
          </div>
        )}

        {mode === "forward" && needsProofApproval && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="approverName">Approved by (client) *</Label>
              <Input id="approverName" value={approverName} onChange={(e) => setApproverName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approvalDate">Approval date *</Label>
              <Input id="approvalDate" type="date" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} />
            </div>
          </div>
        )}

        {mode === "forward" && isQcGate && (
          <p className="text-xs text-muted-foreground">
            Every QC checklist item on this job order must be checked off first — the server will reject this if any are still open.
          </p>
        )}
        {mode === "forward" && isDeliveryGate && (
          <p className="text-xs text-muted-foreground">
            Requires a delivery already marked delivered — the server will reject this otherwise.
          </p>
        )}

        {mode === "backward" && (
          <div className="space-y-1.5">
            <Label htmlFor="note">Rework note *</Label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this going back a stage?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!target || isPending} onClick={handleSubmit}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {mode === "forward" ? "Advance" : "Send back"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
