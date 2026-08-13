import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { HR_OR_FINANCE_ROLES, HR_ROLES } from "@/lib/auth/permissions";
import { listEmployees } from "@/lib/data/hr";
import { listActiveUsers } from "@/lib/data/users";
import { DataTable } from "@/components/shared/data-table";
import { employeeColumns } from "./columns";
import { EmployeeFormSheet } from "./employee-form-sheet";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!HR_OR_FINANCE_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <UserCog className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Employee records are visible to HR, Admin, and Management only.</p>
      </div>
    );
  }

  const [employeeRows, activeUsers] = await Promise.all([listEmployees(user), listActiveUsers(user)]);
  const canEdit = HR_ROLES.includes(user.role);
  const userOptions = activeUsers.map((u) => ({ id: u.id, fullName: u.fullName }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employeeRows.length} on the roster</p>
        </div>
        {canEdit && <EmployeeFormSheet users={userOptions} />}
      </div>

      <DataTable
        columns={employeeColumns(userOptions)}
        data={employeeRows}
        searchPlaceholder="Search employees..."
        emptyState={<span className="text-sm text-muted-foreground">No employees yet.</span>}
      />
    </div>
  );
}
