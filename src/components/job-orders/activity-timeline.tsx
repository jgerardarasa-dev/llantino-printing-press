import { ArrowRight, RotateCcw } from "lucide-react";

import { STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StageHistoryRow = {
  history: {
    id: string;
    fromStage: string | null;
    toStage: string;
    changedAt: string | Date;
    durationMinutes: number | null;
    note: string | null;
    isRework: boolean;
  };
  changedByName: string | null;
};

function formatDuration(minutes: number | null) {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** SPEC §6 JO detail layout item 5: full activity timeline, newest first — sourced from the trigger-written jo_stage_history. */
export function ActivityTimeline({ entries }: { entries: StageHistoryRow[] }) {
  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map(({ history, changedByName }) => (
        <li key={history.id} className="flex gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
              history.isRework ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}
          >
            {history.isRework ? <RotateCcw className="size-3" /> : <ArrowRight className="size-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {history.fromStage && (
                <>
                  <span className="text-muted-foreground">{STAGE_LABELS[history.fromStage as JobOrderStage] ?? history.fromStage}</span>
                  {" → "}
                </>
              )}
              <span className="font-medium">{STAGE_LABELS[history.toStage as JobOrderStage] ?? history.toStage}</span>
              {history.isRework && <span className="ml-2 text-xs font-medium text-destructive">rework</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {changedByName ?? "System"} · {formatDateTime(history.changedAt)}
              {formatDuration(history.durationMinutes) && ` · spent ${formatDuration(history.durationMinutes)} in previous stage`}
            </p>
            {history.note && <p className="mt-0.5 text-sm text-muted-foreground">{history.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
