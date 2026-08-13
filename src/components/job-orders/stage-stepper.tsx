"use client";

import { Check, Pause } from "lucide-react";

import { STAGE_SEQUENCE } from "@/lib/job-orders/state-machine";
import { STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type HistoryEntry = { toStage: string; changedAt: string | Date; changedByName: string | null };

/**
 * Horizontal stepper across the whole pipeline (SPEC §6 JO detail
 * layout item 2): completed stages green with date + who, current
 * pulsing, future grey. Clicking the current stage opens the advance
 * dialog — `onAdvanceClick` is omitted entirely for the production-
 * hidden read view or roles that can't advance stages.
 */
export function StageStepper({
  currentStage,
  isOnHold,
  history,
  onAdvanceClick,
}: {
  currentStage: JobOrderStage;
  isOnHold: boolean;
  history: HistoryEntry[];
  onAdvanceClick?: () => void;
}) {
  const currentIdx = STAGE_SEQUENCE.indexOf(currentStage as (typeof STAGE_SEQUENCE)[number]);
  const isCancelled = currentStage === "cancelled";

  const completedAt = (stage: JobOrderStage) => history.find((h) => h.toStage === stage);

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        This job order was cancelled.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-1">
        {STAGE_SEQUENCE.map((stage, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const entry = completedAt(stage);
          const clickable = isCurrent && onAdvanceClick;

          return (
            <div key={stage} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={onAdvanceClick}
                className={cn(
                  "flex w-28 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center",
                  clickable && "cursor-pointer hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                    isDone && "border-success bg-success text-success-foreground",
                    isCurrent && !isOnHold && "border-primary bg-primary text-primary-foreground animate-pulse",
                    isCurrent && isOnHold && "border-warning bg-warning text-warning-foreground",
                    !isDone && !isCurrent && "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : isCurrent && isOnHold ? <Pause className="size-3.5" /> : idx + 1}
                </span>
                <span className={cn("text-[11px] leading-tight", isCurrent ? "font-medium" : "text-muted-foreground")}>
                  {STAGE_LABELS[stage]}
                </span>
                {entry && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(entry.changedAt)}
                    {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                  </span>
                )}
              </button>
              {idx < STAGE_SEQUENCE.length - 1 && (
                <div className={cn("h-px w-4 shrink-0", isDone ? "bg-success" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
