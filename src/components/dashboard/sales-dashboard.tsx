import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StageBadge } from "@/components/shared/stage-badge";
import { formatDate, formatRelativeDays } from "@/lib/format";
import type { getSalesDashboardData } from "@/lib/data/dashboard";

const LEAD_STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
};

/** SPEC §8 Sales role dashboard. */
export function SalesDashboard({ data }: { data: Awaited<ReturnType<typeof getSalesDashboardData>> }) {
  const leadsTotal = data.leadsByStage.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="My open leads" value={String(leadsTotal)} />
        <KpiCard label="Awaiting client response" value={String(data.quotationsAwaitingResponse.length)} />
        <KpiCard label="Won this month" value={String(data.wonThisMonth)} tone="success" />
        <KpiCard label="Lost this month" value={String(data.lostThisMonth)} tone={data.lostThisMonth > 0 ? "destructive" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My leads by stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.leadsByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open leads assigned to you.</p>
            ) : (
              data.leadsByStage.map((r) => (
                <div key={r.stage} className="flex items-center justify-between text-sm">
                  <span>{LEAD_STAGE_LABELS[r.stage] ?? r.stage}</span>
                  <span className="font-medium tabular-nums">{r.count}</span>
                </div>
              ))
            )}
            <Link href="/leads" className="inline-block pt-1 text-xs text-primary hover:underline">
              Open leads pipeline →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotations expiring in 7 days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.quotationsExpiring7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">None expiring soon.</p>
            ) : (
              data.quotationsExpiring7d.map((q) => (
                <div key={q.id} className="flex items-center justify-between text-sm">
                  <Link href={`/quotations/${q.id}`} className="font-medium hover:underline">
                    {q.quoteNumber}
                  </Link>
                  <span className="text-xs text-muted-foreground">{q.clientName ?? "—"} · {formatRelativeDays(q.validUntil)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients with no interaction in 30 days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.clientsNoInteraction30d.length === 0 ? (
              <p className="text-sm text-muted-foreground">All your clients are up to date.</p>
            ) : (
              data.clientsNoInteraction30d.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                    {c.companyName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {c.lastInteraction ? `Last: ${formatDate(c.lastInteraction)}` : "No interaction logged"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My job orders in progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.myJobOrdersInProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No job orders currently in progress.</p>
            ) : (
              data.myJobOrdersInProgress.slice(0, 8).map((jo) => (
                <div key={jo.id} className="flex items-center justify-between text-sm">
                  <Link href={`/job-orders/${jo.id}`} className="font-medium hover:underline">
                    {jo.joNumber}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{jo.clientName ?? "—"}</span>
                    <StageBadge stage={jo.stage} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {data.quotationsAwaitingResponse.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quotations awaiting client response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.quotationsAwaitingResponse.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm">
                <Link href={`/quotations/${q.id}`} className="font-medium hover:underline">
                  {q.quoteNumber}
                </Link>
                <span className="text-xs text-muted-foreground">{q.clientName ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
