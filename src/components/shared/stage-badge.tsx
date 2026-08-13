import { STAGE_COLOURS, STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, className }: { stage: JobOrderStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STAGE_COLOURS[stage],
        className
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
