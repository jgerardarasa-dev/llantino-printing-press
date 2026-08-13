import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { STAGE_LABELS } from "@/lib/constants/job-order-stages";
import { listInvoices } from "@/lib/data/accounting";
import {
  getAccountingDashboardData,
  getAtRiskJobs,
  getBottleneckStats,
  getDeliveriesThisWeek,
  getHrDashboardData,
  getManagementKpis,
  getProductionDashboardData,
  getSalesDashboardData,
  getStageFunnel,
  getStaffDashboardData,
  getTopClientsByRevenue,
} from "@/lib/data/dashboard";
import { formatCentavos } from "@/lib/format";
import { AgingSummary } from "@/components/accounting/aging-summary";
import { AccountingDashboard } from "@/components/dashboard/accounting-dashboard";
import { AtRiskTable } from "@/components/dashboard/at-risk-table";
import { BottleneckChart } from "@/components/dashboard/bottleneck-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DeliveriesThisWeek } from "@/components/dashboard/deliveries-this-week";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProductionDashboard } from "@/components/dashboard/production-dashboard";
import { SalesDashboard } from "@/components/dashboard/sales-dashboard";
import { StageFunnelChart } from "@/components/dashboard/stage-funnel-chart";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { TopClientsSection } from "@/components/dashboard/top-clients-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function defaultTopClientsRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: isoDate(from), to: isoDate(to) };
}

function DashboardHeader({ firstName, subtitle }: { firstName: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold">Hi {firstName} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const firstName = user.fullName.split(" ")[0] ?? "there";

  // SPEC §8: management dashboard is the default landing page for management/admin.
  if (user.role === "admin" || user.role === "management") {
    const sp = await searchParams;
    const range = sp.from && sp.to ? { from: sp.from, to: sp.to } : defaultTopClientsRange();

    const [kpis, funnel, bottleneck, atRisk, deliveries, invoices, topClients] = await Promise.all([
      getManagementKpis(user),
      getStageFunnel(user),
      getBottleneckStats(user),
      getAtRiskJobs(user),
      getDeliveriesThisWeek(user),
      listInvoices(user),
      getTopClientsByRevenue(user, range),
    ]);

    return (
      <div className="space-y-6">
        <DashboardHeader firstName={firstName} subtitle="Company-wide snapshot, updated live." />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Active JOs" value={String(kpis.activeJos)} />
          <KpiCard label="Due this week" value={String(kpis.dueThisWeek)} />
          <KpiCard label="Overdue" value={String(kpis.overdue)} tone={kpis.overdue > 0 ? "destructive" : "default"} />
          <KpiCard label="Quotes pending approval" value={String(kpis.quotationsPendingApproval)} />
          <KpiCard label="Win rate (30d)" value={kpis.quotationWinRate30d !== null ? `${kpis.quotationWinRate30d}%` : "—"} />
          <KpiCard label="Revenue MTD" value={formatCentavos(kpis.revenueMtdCentavos)} />
          <KpiCard
            label="Receivables outstanding"
            value={formatCentavos(kpis.receivablesOutstandingCentavos)}
            tone={kpis.receivablesOutstandingCentavos > 0 ? "destructive" : "default"}
          />
          <KpiCard label="Cash collected MTD" value={formatCentavos(kpis.cashCollectedMtdCentavos)} tone="success" />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="JO pipeline funnel"
            description="Count and peso value of job orders currently at each stage."
            csvFilename="jo-pipeline-funnel.csv"
            data={funnel}
            csvColumns={[
              { header: "Stage", accessor: (r) => STAGE_LABELS[r.stage] },
              { header: "Count", accessor: (r) => r.count },
              { header: "Value (PHP)", accessor: (r) => (r.valueCentavos !== null ? (r.valueCentavos / 100).toFixed(2) : "") },
            ]}
            tableColumns={[
              { header: "Stage", cell: (r) => STAGE_LABELS[r.stage] },
              { header: "Count", cell: (r) => r.count, align: "right" },
              { header: "Value", cell: (r) => (r.valueCentavos !== null ? formatCentavos(r.valueCentavos) : "—"), align: "right" },
            ]}
          >
            <StageFunnelChart data={funnel} />
          </ChartCard>

          <ChartCard
            title="Bottleneck — avg hours per stage (90d)"
            description="Where job orders spend the most time before moving on, from jo_stage_history."
            csvFilename="jo-bottleneck-90d.csv"
            data={bottleneck}
            csvColumns={[
              { header: "Stage", accessor: (r) => STAGE_LABELS[r.stage] },
              { header: "Avg hours", accessor: (r) => r.avgHours },
              { header: "Sample size", accessor: (r) => r.sampleSize },
            ]}
            tableColumns={[
              { header: "Stage", cell: (r) => STAGE_LABELS[r.stage] },
              { header: "Avg hours", cell: (r) => `${r.avgHours}h`, align: "right" },
              { header: "n", cell: (r) => r.sampleSize, align: "right" },
            ]}
          >
            <BottleneckChart data={bottleneck} />
          </ChartCard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>At-risk jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskTable rows={atRisk} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deliveries this week</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveriesThisWeek rows={deliveries} />
            </CardContent>
          </Card>
          <AgingSummary invoices={invoices} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top clients by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <TopClientsSection rows={topClients} from={range.from} to={range.to} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "sales") {
    const data = await getSalesDashboardData(user);
    return (
      <div className="space-y-6">
        <DashboardHeader firstName={firstName} subtitle="Your leads, quotations, and job orders." />
        <SalesDashboard data={data} />
      </div>
    );
  }

  if (user.role === "production") {
    const data = await getProductionDashboardData(user);
    return (
      <div className="space-y-6">
        <DashboardHeader firstName={firstName} subtitle="Today's production queue and floor status." />
        <ProductionDashboard data={data} />
      </div>
    );
  }

  if (user.role === "accounting") {
    const data = await getAccountingDashboardData(user);
    return (
      <div className="space-y-6">
        <DashboardHeader firstName={firstName} subtitle="Billing, collections, and expenses." />
        <AccountingDashboard data={data} />
      </div>
    );
  }

  if (user.role === "hr") {
    const data = await getHrDashboardData(user);
    return (
      <div className="space-y-6">
        <DashboardHeader firstName={firstName} subtitle="Headcount, leave, and attendance." />
        <HrDashboard data={data} />
      </div>
    );
  }

  // staff
  const data = await getStaffDashboardData(user);
  return (
    <div className="space-y-6">
      <DashboardHeader firstName={firstName} subtitle="Your tasks, calendar, attendance, and leave." />
      <StaffDashboard data={data} />
    </div>
  );
}
