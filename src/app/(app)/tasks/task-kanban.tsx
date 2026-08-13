"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTask, updateTaskStatus } from "@/lib/actions/task-actions";
import {
  TASK_PRIORITY_VARIANT,
  TASK_STATUSES,
  TASK_STATUS_COLOURS,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/constants/task-status";
import { formatDate } from "@/lib/format";
import type { TaskRow } from "@/lib/data/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TaskKanban({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", TASK_STATUS_COLOURS[status])}>
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Empty</div>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function moveStatus(status: TaskStatus) {
    const blockedReason = status === "blocked" ? window.prompt("Why is this blocked? (optional)") ?? undefined : undefined;
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, status, blockedReason);
      if (result.error) toast.error(result.error);
      else {
        if (status === "done" && task.recurrenceRule) toast.success("Next occurrence created");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium">{task.title}</p>
        {task.recurrenceRule && <Repeat className="mt-0.5 size-3 shrink-0 text-muted-foreground" />}
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={TASK_PRIORITY_VARIANT[task.priority] ?? "outline"} className="text-[10px] capitalize">{task.priority}</Badge>
        {task.department && <span className="text-[10px] text-muted-foreground">{task.department}</span>}
        {task.dueDate && <span className="text-[10px] text-muted-foreground">Due {formatDate(task.dueDate)}</span>}
      </div>
      {task.assigneeName && <p className="mt-1 text-[10px] text-muted-foreground">{task.assigneeName}</p>}

      <div className="mt-2 flex items-center gap-1.5">
        <Select value={task.status} onValueChange={(v) => moveStatus(v as TaskStatus)} disabled={isPending}>
          <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{TASK_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              if (!confirm(`Delete "${task.title}"?`)) return;
              startTransition(async () => {
                const result = await deleteTask(task.id);
                if (result.error) toast.error(result.error);
                else router.refresh();
              });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
