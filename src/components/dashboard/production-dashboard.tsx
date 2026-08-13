import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StageBadge } from "@/components/shared/stage-badge";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDays } from "@/lib/format";
import type { getProductionDashboardData } from "@/lib/data/dashboard";

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  normal: "outline",
  rush: "warning",
  critical: "destructive",
};

/** SPEC §8 Production role dashboard. */
export function ProductionDashboard({ data }: { data: Awaited<ReturnType<typeof getProductionDashboardData>> }) {
  const outputPct =
    data.outputVsPlan.ordered > 0 ? Math.round((data.outputVsPlan.produced / data.outputVsPlan.ordered) * 1000) / 10 : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="In today's queue" value={String(data.todaysQueue.length)} />
        <KpiCard label="At my stage" value={String(data.myStageJobOrders.length)} />
        <KpiCard
          label="Waste rate this week"
          value={`${data.wasteRateThisWeek}%`}
          hint={`${data.wasteCountThisWeek.toLocaleString()} waste / ${data.goodOutputThisWeek.toLocaleString()} good`}
          tone={data.wasteRateThisWeek > 5 ? "destructive" : "default"}
        />
        <KpiCard label="Output vs plan" value={outputPct !== null ? `${outputPct}%` : "—"} hint={`${data.outputVsPlan.produced.toLocaleString()} / ${data.outputVsPlan.ordered.toLocaleString()} pcs`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&rsquo;s production queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.todaysQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in the active production queue.</p>
            ) : (
              data.todaysQueue.slice(0, 12).map((jo) => (
                <div key={jo.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/job-orders/${jo.id}`} className="font-medium hover:underline">
                    {jo.joNumber}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">{jo.clientName ?? "—"}</span>
                    <Badge variant={PRIORITY_VARIANT[jo.priority] ?? "outline"} className="capitalize">
                      {jo.priority}
                    </Badge>
                    <StageBadge stage={jo.stage} />
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{formatRelativeDays(jo.targetDeliveryDate)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Materials shortages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.materialsShortages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shortfalls — issued sheets match plan.</p>
            ) : (
              data.materialsShortages.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-warning" />
                    {m.joNumber ?? "—"} · {m.materialName ?? "—"}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {m.sheetsIssued} / {m.sheetsPlanned} sheets
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job orders at my stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.myStageJobOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing assigned to you right now.</p>
            ) : (
              data.myStageJobOrders.map((jo) => (
                <div key={jo.id} className="flex items-center justify-between text-sm">
                  <Link href={`/job-orders/${jo.id}`} className="font-medium hover:underline">
                    {jo.joNumber}
                  </Link>
                  <StageBadge stage={jo.stage} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
