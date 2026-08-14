import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { HR_OR_FINANCE_ROLES, HR_ROLES } from "@/lib/auth/permissions";
import { listAttendance, listEmployees } from "@/lib/data/hr";
import { AttendanceForm } from "./attendance-form";
import { AttendanceImport } from "./attendance-import";
import { AttendanceTable } from "./columns";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!HR_OR_FINANCE_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <ClipboardList className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Attendance is visible to HR, Admin, and Management only.</p>
      </div>
    );
  }

  const canEdit = HR_ROLES.includes(user.role);
  const [attendanceRows, employeeRows] = await Promise.all([listAttendance(user), listEmployees(user)]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">{attendanceRows.length} recent records</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-1">
          {canEdit && (
            <>
              <AttendanceForm employees={employeeRows.map((e) => ({ id: e.id, fullName: e.fullName, employeeNo: e.employeeNo }))} />
              <AttendanceImport />
            </>
          )}
        </div>
        <div className="lg:col-span-3">
          <AttendanceTable
            data={attendanceRows}
            searchPlaceholder="Search attendance..."
            emptyState={<span className="text-sm text-muted-foreground">No attendance records yet.</span>}
          />
        </div>
      </div>
    </div>
  );
}
