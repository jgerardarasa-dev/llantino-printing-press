"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logProduction, type ActionState } from "@/lib/actions/job-order-production-actions";
import { STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export type ProductionLogRow = {
  log: {
    id: string;
    stage: string;
    machine: string | null;
    goodOutput: number;
    wasteCount: number;
    wasteReason: string | null;
    createdAt: string | Date;
  };
  operatorName: string | null;
};

export function ProductionLogsPanel({
  jobOrderId,
  currentStage,
  logs,
  canEdit,
}: {
  jobOrderId: string;
  currentStage: JobOrderStage;
  logs: ProductionLogRow[];
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(logProduction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Production log added");
      formRef.current?.reset();
    }
  }, [state.success]);

  const totalGood = logs.reduce((s, l) => s + l.log.goodOutput, 0);
  const totalWaste = logs.reduce((s, l) => s + l.log.wasteCount, 0);

  return (
    <div className="space-y-3">
      {logs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Output so far: <span className="tabular-nums font-medium text-foreground">{totalGood.toLocaleString()}</span> good ·{" "}
          <span className="tabular-nums font-medium text-foreground">{totalWaste.toLocaleString()}</span> waste
        </p>
      )}

      {canEdit && (
        <form ref={formRef} action={formAction} className="space-y-2 rounded-lg border border-border p-3">
          <input type="hidden" name="jobOrderId" value={jobOrderId} />
          <input type="hidden" name="stage" value={currentStage} />
          <p className="text-xs font-medium text-muted-foreground">Log output — {STAGE_LABELS[currentStage]}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="machine" className="text-xs">Machine</Label>
              <Input id="machine" name="machine" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="goodOutput" className="text-xs">Good output</Label>
              <Input id="goodOutput" name="goodOutput" type="number" min={0} className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="wasteCount" className="text-xs">Waste count</Label>
              <Input id="wasteCount" name="wasteCount" type="number" min={0} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wasteReason" className="text-xs">Waste reason</Label>
              <Input id="wasteReason" name="wasteReason" className="h-8 text-xs" />
            </div>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Add log
          </Button>
        </form>
      )}

      <ul className="space-y-1.5">
        {logs.map(({ log, operatorName }) => (
          <li key={log.id} className="rounded-md border border-border p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">{STAGE_LABELS[log.stage as JobOrderStage] ?? log.stage}</span>
              <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {operatorName ?? "—"} {log.machine && `· ${log.machine}`} · {log.goodOutput.toLocaleString()} good
              {log.wasteCount > 0 && `, ${log.wasteCount.toLocaleString()} waste`}
              {log.wasteReason && ` (${log.wasteReason})`}
            </p>
          </li>
        ))}
        {logs.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No production logs yet.</p>}
      </ul>
    </div>
  );
}
