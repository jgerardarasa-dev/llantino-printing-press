import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Megaphone } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { MANAGEMENT_DASHBOARD_ROLES } from "@/lib/auth/permissions";
import {
  defaultNinetyDayRange,
  defaultTwelveMonthRange,
  getClientRetention,
  getConversionRateBySalesperson,
  getConversionRateBySource,
  getLeadTimeTrend,
  getRevenueByBoxStyle,
  getRevenueByIndustry,
  getRevenueByMonth,
  getWasteRateByOperator,
  getWasteRateByStage,
} from "@/lib/data/analytics";
import { getTopClientsByRevenue } from "@/lib/data/dashboard";
import { formatCentavos } from "@/lib/format";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangeForm } from "@/components/dashboard/date-range-form";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueTrendChart } from "@/components/analytics/revenue-trend-chart";
import { LeadTimeTrendChart } from "@/components/analytics/lead-time-trend-chart";
import { WasteRateByStageChart } from "@/components/analytics/waste-rate-by-stage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** No dedicated box-style label map exists yet (the box-spec list keeps its own local one) — humanize inline. */
function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!MANAGEMENT_DASHBOARD_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Analytics is visible to Management and Admin only.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = sp.from && sp.to ? { from: sp.from, to: sp.to } : defaultTwelveMonthRange();

  const [
    revenueByMonth,
    revenueByClient,
    revenueByBoxStyle,
    revenueByIndustry,
    conversionBySalesperson,
    conversionBySource,
    leadTimeTrend,
    wasteByStage,
    wasteByOperator,
    retention,
  ] = await Promise.all([
    getRevenueByMonth(user, range),
    getTopClientsByRevenue(user, range, 50),
    getRevenueByBoxStyle(user, range),
    getRevenueByIndustry(user, range),
    getConversionRateBySalesperson(user, range),
    getConversionRateBySource(user, range),
    getLeadTimeTrend(user, range),
    getWasteRateByStage(user, defaultNinetyDayRange()),
    getWasteRateByOperator(user, defaultNinetyDayRange()),
    getClientRetention(user),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, conversion, lead time, and waste. The date range below applies to every section except
            retention (which is all-time by design — a short window makes &ldquo;repeat&rdquo; meaningless).
          </p>
        </div>
        <Link
          href="/analytics/ads"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent/40"
        >
          <Megaphone className="size-3.5" />
          Meta Ads
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <DateRangeForm action="/analytics" from={range.from} to={range.to} />

      <Card>
        <CardHeader>
          <CardTitle>Job costing — quoted vs actual</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            The single most valuable report in the system — quoted cost vs. actual cost per job order, with
            variance %. Built in Milestone 8; opens as its own full page rather than being duplicated here.
          </p>
          <Link
            href="/accounting/job-costing"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent/40"
          >
            Open report
            <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <ChartCard
        title="Revenue by month"
        description="Invoice subtotal (ex-VAT), non-cancelled invoices."
        csvFilename={`revenue-by-month-${range.from}-to-${range.to}.csv`}
        data={revenueByMonth}
        csvColumns={[
          { header: "Month", accessor: (r) => r.month },
          { header: "Revenue (PHP)", accessor: (r) => (r.revenueCentavos / 100).toFixed(2) },
        ]}
        tableColumns={[
          { header: "Month", cell: (r) => r.month },
          { header: "Revenue", cell: (r) => formatCentavos(r.revenueCentavos), align: "right" },
        ]}
      >
        <RevenueTrendChart data={revenueByMonth} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue by client"
          csvFilename={`revenue-by-client-${range.from}-to-${range.to}.csv`}
          data={revenueByClient}
          csvColumns={[
            { header: "Client", accessor: (r) => r.clientName ?? "Unspecified" },
            { header: "Revenue (PHP)", accessor: (r) => (r.revenueCentavos / 100).toFixed(2) },
          ]}
          tableColumns={[
            { header: "Client", cell: (r) => r.clientName ?? "Unspecified" },
            { header: "Revenue", cell: (r) => formatCentavos(r.revenueCentavos), align: "right" },
          ]}
        />
        <ChartCard
          title="Revenue by box style"
          csvFilename={`revenue-by-box-style-${range.from}-to-${range.to}.csv`}
          data={revenueByBoxStyle}
          csvColumns={[
            { header: "Box style", accessor: (r) => humanize(r.label) },
            { header: "Revenue (PHP)", accessor: (r) => (r.revenueCentavos / 100).toFixed(2) },
          ]}
          tableColumns={[
            { header: "Box style", cell: (r) => humanize(r.label) },
            { header: "Revenue", cell: (r) => formatCentavos(r.revenueCentavos), align: "right" },
          ]}
        />
        <ChartCard
          title="Revenue by industry"
          csvFilename={`revenue-by-industry-${range.from}-to-${range.to}.csv`}
          data={revenueByIndustry}
          csvColumns={[
            { header: "Industry", accessor: (r) => r.label },
            { header: "Revenue (PHP)", accessor: (r) => (r.revenueCentavos / 100).toFixed(2) },
          ]}
          tableColumns={[
            { header: "Industry", cell: (r) => r.label },
            { header: "Revenue", cell: (r) => formatCentavos(r.revenueCentavos), align: "right" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Quotation conversion rate by salesperson"
          description="Quotations decided (approved/rejected) in range."
          csvFilename={`conversion-by-salesperson-${range.from}-to-${range.to}.csv`}
          data={conversionBySalesperson}
          csvColumns={[
            { header: "Salesperson", accessor: (r) => r.label },
            { header: "Won", accessor: (r) => r.won },
            { header: "Lost", accessor: (r) => r.lost },
            { header: "Conversion %", accessor: (r) => r.conversionRatePct ?? "" },
          ]}
          tableColumns={[
            { header: "Salesperson", cell: (r) => r.label },
            { header: "Won", cell: (r) => r.won, align: "right" },
            { header: "Lost", cell: (r) => r.lost, align: "right" },
            { header: "Rate", cell: (r) => (r.conversionRatePct !== null ? `${r.conversionRatePct}%` : "—"), align: "right" },
          ]}
        />
        <ChartCard
          title="Quotation conversion rate by lead source"
          description="Source = the originating lead's source, or the client's if not lead-sourced."
          csvFilename={`conversion-by-source-${range.from}-to-${range.to}.csv`}
          data={conversionBySource}
          csvColumns={[
            { header: "Source", accessor: (r) => r.label },
            { header: "Won", accessor: (r) => r.won },
            { header: "Lost", accessor: (r) => r.lost },
            { header: "Conversion %", accessor: (r) => r.conversionRatePct ?? "" },
          ]}
          tableColumns={[
            { header: "Source", cell: (r) => r.label },
            { header: "Won", cell: (r) => r.won, align: "right" },
            { header: "Lost", cell: (r) => r.lost, align: "right" },
            { header: "Rate", cell: (r) => (r.conversionRatePct !== null ? `${r.conversionRatePct}%` : "—"), align: "right" },
          ]}
        />
      </div>

      <ChartCard
        title="Average lead time trend"
        description="JO creation (order date) to actual delivery, trended by delivery month."
        csvFilename={`lead-time-trend-${range.from}-to-${range.to}.csv`}
        data={leadTimeTrend}
        csvColumns={[
          { header: "Month", accessor: (r) => r.month },
          { header: "Avg days", accessor: (r) => r.avgDays ?? "" },
          { header: "Sample size", accessor: (r) => r.sampleSize },
        ]}
        tableColumns={[
          { header: "Month", cell: (r) => r.month },
          { header: "Avg days", cell: (r) => (r.avgDays !== null ? `${r.avgDays}d` : "—"), align: "right" },
          { header: "n", cell: (r) => r.sampleSize, align: "right" },
        ]}
      >
        <LeadTimeTrendChart data={leadTimeTrend} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Waste rate by stage (90d)"
          csvFilename="waste-rate-by-stage-90d.csv"
          data={wasteByStage}
          csvColumns={[
            { header: "Stage", accessor: (r) => r.label },
            { header: "Good output", accessor: (r) => r.goodOutput },
            { header: "Waste", accessor: (r) => r.wasteCount },
            { header: "Waste rate %", accessor: (r) => r.wasteRatePct },
          ]}
          tableColumns={[
            { header: "Stage", cell: (r) => r.label },
            { header: "Good", cell: (r) => r.goodOutput, align: "right" },
            { header: "Waste", cell: (r) => r.wasteCount, align: "right" },
            { header: "Rate", cell: (r) => `${r.wasteRatePct}%`, align: "right" },
          ]}
        >
          <WasteRateByStageChart data={wasteByStage} />
        </ChartCard>

        <ChartCard
          title="Waste rate by operator (90d)"
          csvFilename="waste-rate-by-operator-90d.csv"
          data={wasteByOperator}
          csvColumns={[
            { header: "Operator", accessor: (r) => r.label },
            { header: "Good output", accessor: (r) => r.goodOutput },
            { header: "Waste", accessor: (r) => r.wasteCount },
            { header: "Waste rate %", accessor: (r) => r.wasteRatePct },
          ]}
          tableColumns={[
            { header: "Operator", cell: (r) => r.label },
            { header: "Good", cell: (r) => r.goodOutput, align: "right" },
            { header: "Waste", cell: (r) => r.wasteCount, align: "right" },
            { header: "Rate", cell: (r) => `${r.wasteRatePct}%`, align: "right" },
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client retention / repeat order rate</CardTitle>
          <p className="text-xs text-muted-foreground">All-time — every non-cancelled job order, regardless of date range above.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Clients with orders" value={String(retention.clientsWithOrders)} />
          <KpiCard label="Repeat clients (2+ JOs)" value={String(retention.repeatClients)} />
          <KpiCard
            label="Repeat rate"
            value={retention.repeatRatePct !== null ? `${retention.repeatRatePct}%` : "—"}
            tone="success"
          />
        </CardContent>
      </Card>
    </div>
  );
}
