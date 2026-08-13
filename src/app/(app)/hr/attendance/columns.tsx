"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { AttendanceRow } from "@/lib/data/hr";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  present: "default",
  absent: "destructive",
  late: "warning",
  half_day: "secondary",
  leave: "outline",
  holiday: "outline",
};

export const attendanceColumns: ColumnDef<AttendanceRow, unknown>[] = [
  { accessorKey: "employeeName", header: "Employee", cell: ({ row }) => row.original.employeeName || "—" },
  { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.date)}</span> },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"} className="capitalize">{row.original.status.replace("_", " ")}</Badge>,
  },
  { accessorKey: "timeIn", header: "Time in", cell: ({ row }) => row.original.timeIn || "—" },
  { accessorKey: "timeOut", header: "Time out", cell: ({ row }) => row.original.timeOut || "—" },
  { accessorKey: "hoursWorked", header: "Hours", cell: ({ row }) => <span className="tabular-nums">{row.original.hoursWorked ?? "—"}</span> },
  { accessorKey: "overtimeHours", header: "OT", cell: ({ row }) => <span className="tabular-nums">{row.original.overtimeHours}</span> },
];
