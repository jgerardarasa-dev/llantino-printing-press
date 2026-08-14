"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { softDeleteEmployee } from "@/lib/actions/employee-actions";
import { formatCentavos } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import type { EmployeeRow } from "@/lib/data/hr";
import { EmployeeFormSheet } from "./employee-form-sheet";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning"> = {
  active: "default",
  resigned: "secondary",
  terminated: "destructive",
  awol: "warning",
};

function RowActions({ employee, users }: { employee: EmployeeRow; users: { id: string; fullName: string }[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      <EmployeeFormSheet
        users={users}
        employee={employee}
        trigger={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Remove ${employee.fullName} from the roster?`)) return;
          startTransition(async () => {
            const result = await softDeleteEmployee(employee.id);
            if (result.error) toast.error(result.error);
            else toast.success("Employee removed");
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function employeeColumns(users: { id: string; fullName: string }[]): ColumnDef<EmployeeRow, unknown>[] {
  return [
    { accessorKey: "employeeNo", header: "Employee #", cell: ({ row }) => <span className="font-medium">{row.original.employeeNo}</span> },
    { accessorKey: "fullName", header: "Name" },
    { accessorKey: "position", header: "Position", cell: ({ row }) => row.original.position || "—" },
    { accessorKey: "department", header: "Department", cell: ({ row }) => row.original.department || "—" },
    {
      accessorKey: "employmentType",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.employmentType}</Badge>,
    },
    {
      id: "rate",
      header: "Rate",
      cell: ({ row }) =>
        row.original.dailyRateCentavos != null ? (
          <span className="tabular-nums">{formatCentavos(row.original.dailyRateCentavos)}/day</span>
        ) : row.original.monthlyRateCentavos != null ? (
          <span className="tabular-nums">{formatCentavos(row.original.monthlyRateCentavos)}/mo</span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"} className="capitalize">{row.original.status}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RowActions employee={row.original} users={users} />,
    },
  ];
}

/** See ClientsTable's doc comment (clients/columns.tsx) for why this wrapper exists. */
export function EmployeesTable({
  data,
  users,
  searchPlaceholder,
  emptyState,
}: {
  data: EmployeeRow[];
  users: { id: string; fullName: string }[];
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  return <DataTable columns={employeeColumns(users)} data={data} searchPlaceholder={searchPlaceholder} emptyState={emptyState} />;
}
