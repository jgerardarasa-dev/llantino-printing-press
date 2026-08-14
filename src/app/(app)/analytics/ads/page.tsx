import { redirect } from "next/navigation";
import { ExternalLink, Megaphone } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AD_SPEND_ROLES } from "@/lib/auth/permissions";
import { getAdSpendSummary, listAdSpend } from "@/lib/data/ad-spend";
import { defaultTwelveMonthRange } from "@/lib/data/analytics";
import { getSettings } from "@/lib/settings/get-settings";
import { buildCsv } from "@/lib/csv";
import { formatCentavos, formatDate } from "@/lib/format";
import { AdSpendFormDialog } from "@/components/analytics/ad-spend-form-dialog";
import { MetaAdsSettingsForm } from "@/components/analytics/meta-ads-settings-form";
import { CsvExportButton } from "@/components/shared/csv-export-button";
import { DateRangeForm } from "@/components/dashboard/date-range-form";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function MetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!AD_SPEND_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Megaphone className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Meta Ads is visible to Management and Admin only.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = sp.from && sp.to ? { from: sp.from, to: sp.to } : defaultTwelveMonthRange();

  const [settings, entries, summary] = await Promise.all([
    getSettings(user),
    listAdSpend(user),
    getAdSpendSummary(user, range),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Meta Ads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No live Marketing API integration in the MVP (see SPEC §8) — spend is entered manually each month, and
          cost-per-lead / cost-per-won-client are computed by joining that spend against{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">leads.source = &lsquo;meta_ads&rsquo;</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ads Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Account: <span className="font-medium text-foreground">{settings.metaAdsAccountId || "Not configured"}</span>
            </p>
            <Button asChild size="sm" variant="outline">
              <a href={settings.metaAdsManagerUrl} target="_blank" rel="noopener noreferrer">
                Open Ads Manager
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
          {user.role === "admin" && (
            <MetaAdsSettingsForm accountId={settings.metaAdsAccountId} managerUrl={settings.metaAdsManagerUrl} />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeForm action="/analytics/ads" from={range.from} to={range.to} />
        <AdSpendFormDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total spend" value={formatCentavos(summary.totalSpendCentavos)} />
        <KpiCard label="Meta-sourced leads (CRM)" value={String(summary.totalLeadsFromSource)} hint={`${summary.totalLeadsGenerated} platform-reported`} />
        <KpiCard label="Cost per lead" value={summary.costPerLeadCentavos !== null ? formatCentavos(summary.costPerLeadCentavos) : "—"} />
        <KpiCard label="Cost per won client" value={summary.costPerWonClientCentavos !== null ? formatCentavos(summary.costPerWonClientCentavos) : "—"} hint={`${summary.wonClientsFromSource} won`} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Monthly spend entries</CardTitle>
          <CsvExportButton
            csv={buildCsv(entries, [
              { header: "Month", accessor: (r) => r.month },
              { header: "Platform", accessor: (r) => r.platform },
              { header: "Campaign", accessor: (r) => r.campaignName ?? "" },
              { header: "Spend (PHP)", accessor: (r) => (r.spendCentavos / 100).toFixed(2) },
              { header: "Leads generated", accessor: (r) => r.leadsGenerated },
              { header: "Notes", accessor: (r) => r.notes ?? "" },
            ])}
            filename="meta-ad-spend.csv"
          />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Leads (reported)</TableHead>
                  <TableHead>Logged by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                      No ad spend logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{formatDate(e.month, "MMM yyyy")}</TableCell>
                      <TableCell>{e.campaignName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCentavos(e.spendCentavos)}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.leadsGenerated}</TableCell>
                      <TableCell className="text-muted-foreground">{e.createdByName ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
