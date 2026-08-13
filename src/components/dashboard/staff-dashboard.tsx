import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { getStaffDashboardData } from "@/lib/data/dashboard";

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive" | "secondary"> = {
  low: "outline",
  normal: "secondary",
  high: "warning",
  urgent: "destructive",
};

/** SPEC §8 Staff role dashboard — "my tasks, my calendar, my attendance, my leave balance." */
export function StaffDashboard({ data }: { data: Awaited<ReturnType<typeof getStaffDashboardData>> }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>My tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks assigned to you.</p>
          ) : (
            data.myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{t.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={PRIORITY_VARIANT[t.priority] ?? "outline"} className="capitalize">
                    {t.priority}
                  </Badge>
                  {t.dueDate && <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>}
                </div>
              </div>
            ))
          )}
          <Link href="/tasks" className="inline-block pt-1 text-xs text-primary hover:underline">
            Open my tasks →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Deliveries, meetings, and deadlines assigned to you. Open the full calendar for the week and month view.
          </p>
          <Link href="/calendar" className="mt-2 inline-block text-xs text-primary hover:underline">
            Open calendar →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data.hasEmployeeRecord ? (
            <p className="text-sm text-muted-foreground">No employee record linked to your account yet.</p>
          ) : data.myAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
          ) : (
            data.myAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{formatDate(a.date)}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {a.status} {a.hoursWorked ? `· ${a.hoursWorked}h` : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My leave balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data.hasEmployeeRecord ? (
            <p className="text-sm text-muted-foreground">No employee record linked to your account yet.</p>
          ) : data.myLeaveBalance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave balances set up for this year.</p>
          ) : (
            data.myLeaveBalance.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="capitalize">{b.leaveType.replace("_", " ")}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Number(b.usedDays)} / {Number(b.entitledDays)} days used
                </span>
              </div>
            ))
          )}
          <Link href="/hr/leave" className="inline-block pt-1 text-xs text-primary hover:underline">
            Request leave →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
