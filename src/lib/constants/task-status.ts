export const TASK_STATUSES = ["todo", "in_progress", "blocked", "review", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_STATUS_COLOURS: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
  review: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-neutral-200 text-neutral-600 border-neutral-300",
};

export const TASK_PRIORITY_VARIANT: Record<string, "outline" | "secondary" | "warning" | "destructive"> = {
  low: "outline",
  normal: "secondary",
  high: "warning",
  urgent: "destructive",
};
