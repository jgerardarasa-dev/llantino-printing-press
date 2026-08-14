"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { TaskRow } from "@/lib/data/tasks";
import { TASK_PRIORITY_VARIANT, TASK_STATUS_COLOURS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants/task-status";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

export const taskColumns: ColumnDef<TaskRow, unknown>[] = [
  { accessorKey: "title", header: "Title", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", TASK_STATUS_COLOURS[row.original.status as TaskStatus])}>
        {TASK_STATUS_LABELS[row.original.status as TaskStatus] ?? row.original.status}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <Badge variant={TASK_PRIORITY_VARIANT[row.original.priority] ?? "outline"} className="capitalize">{row.original.priority}</Badge>
    ),
  },
  { accessorKey: "department", header: "Department", cell: ({ row }) => row.original.department || "—" },
  { accessorKey: "assigneeName", header: "Assignee", cell: ({ row }) => row.original.assigneeName || <span className="text-muted-foreground">Unassigned</span> },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.dueDate)}</span>,
  },
];

/** See ClientsTable's doc comment (clients/columns.tsx) for why this wrapper exists. */
export function TasksTable({ data, searchPlaceholder }: { data: TaskRow[]; searchPlaceholder?: string }) {
  return <DataTable columns={taskColumns} data={data} searchPlaceholder={searchPlaceholder} />;
}
