import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { HR_ROLES, LEAVE_APPROVER_ROLES } from "@/lib/auth/permissions";
import { getEmployeeForUser, listEmployees, listHolidays, listLeaveBalances, listLeaveRequests } from "@/lib/data/hr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveRequestForm } from "./leave-request-form";
import { LeaveRequestsList } from "./leave-requests-list";
import { LeaveBalancesTable } from "./leave-balances-table";
import { HolidaysPanel } from "./holidays-panel";

export default async function LeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canApprove = LEAVE_APPROVER_ROLES.includes(user.role);
  const canManageHolidays = HR_ROLES.includes(user.role);

  const [ownEmployee, allRequests, balances, holidayRows] = await Promise.all([
    getEmployeeForUser(user),
    listLeaveRequests(user),
    listLeaveBalances(user),
    listHolidays(user),
  ]);

  const employeeOptions = canApprove ? await listEmployees(user) : [];
  const visibleRequests = canApprove ? allRequests : allRequests.filter((r) => r.employeeId === ownEmployee?.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Leave</h1>
        <p className="text-sm text-muted-foreground">
          {canApprove ? "All leave requests" : "Your leave requests"} · {visibleRequests.filter((r) => r.status === "pending").length} pending
        </p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <LeaveRequestForm
                employees={employeeOptions.map((e) => ({ id: e.id, fullName: e.fullName }))}
                ownEmployeeId={ownEmployee?.id ?? null}
                canFileForOthers={canApprove}
              />
            </div>
            <div className="lg:col-span-3">
              <LeaveRequestsList requests={visibleRequests} canApprove={canApprove} ownEmployeeId={ownEmployee?.id ?? null} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <LeaveBalancesTable balances={canApprove ? balances : balances.filter((b) => b.employeeId === ownEmployee?.id)} />
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <HolidaysPanel holidays={holidayRows} canEdit={canManageHolidays} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
