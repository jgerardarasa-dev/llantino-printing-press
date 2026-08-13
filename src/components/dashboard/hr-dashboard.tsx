import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDate } from "@/lib/format";
import type { getHrDashboardData } from "@/lib/data/dashboard";

/** SPEC §8 HR role dashboard. */
export function HrDashboard({ data }: { data: Awaited<ReturnType<typeof getHrDashboardData>> }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Headcount" value={String(data.headcount)} />
        <KpiCard label="On leave today" value={String(data.onLeaveToday.length)} />
        <KpiCard label="Pending leave requests" value={String(data.pendingLeaveRequests.length)} tone={data.pendingLeaveRequests.length > 0 ? "destructive" : "default"} />
        <KpiCard label="Attendance exceptions this week" value={String(data.attendanceExceptionsThisWeek.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Who&rsquo;s on leave today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.onLeaveToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is on approved leave today.</p>
            ) : (
              data.onLeaveToday.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <span>{l.employeeName ?? "—"}</span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {l.leaveType.replace("_", " ")} · until {formatDate(l.endDate)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending leave requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingLeaveRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing awaiting approval.</p>
            ) : (
              data.pendingLeaveRequests.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <span>{l.employeeName ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(l.startDate)} – {formatDate(l.endDate)} ({l.days}d)
                  </span>
                </div>
              ))
            )}
            <Link href="/hr/leave" className="inline-block pt-1 text-xs text-primary hover:underline">
              Review leave requests →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance exceptions this week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.attendanceExceptionsThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">No absences or late marks this week.</p>
            ) : (
              data.attendanceExceptionsThisWeek.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.employeeName ?? "—"}</span>
                  <Badge variant={a.status === "absent" ? "destructive" : "warning"} className="capitalize">
                    {a.status} · {formatDate(a.date)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming regularization dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingRegularization.length === 0 ? (
              <p className="text-sm text-muted-foreground">No probationary employees pending regularization.</p>
            ) : (
              data.upcomingRegularization.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span>{e.fullName}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatDate(e.regularizationDate)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
