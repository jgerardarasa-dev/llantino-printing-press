"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCentavos, formatDate } from "@/lib/format";
import type { getAccountingDashboardData } from "@/lib/data/dashboard";

/** SPEC §8 Accounting role dashboard. */
export function AccountingDashboard({ data }: { data: Awaited<ReturnType<typeof getAccountingDashboardData>> }) {
  const unbilledTotal = data.unbilledDeliveredJobOrders.reduce((s, jo) => s + jo.totalCentavos, 0);
  const chartData = data.cashInOutByWeek.map((w) => ({
    week: formatDate(w.week, "MMM d"),
    "Cash in": w.cashInCentavos / 100,
    "Cash out": w.cashOutCentavos / 100,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Unbilled delivered JOs" value={String(data.unbilledDeliveredJobOrders.length)} hint={formatCentavos(unbilledTotal)} tone={data.unbilledDeliveredJobOrders.length > 0 ? "destructive" : "default"} />
        <KpiCard label="Payments this week" value={formatCentavos(data.paymentsThisWeekTotalCentavos)} hint={`${data.paymentsThisWeek.length} received`} tone="success" />
        <KpiCard label="Expenses this month" value={formatCentavos(data.expensesThisMonthTotalCentavos)} />
        <KpiCard label="Net cash (8wk)" value={formatCentavos(data.cashInOutByWeek.reduce((s, w) => s + w.cashInCentavos - w.cashOutCentavos, 0))} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash in / out, last 8 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₱${v.toLocaleString()}`} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                formatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Cash in" fill="#2a78d6" radius={[3, 3, 0, 0]} barSize={14} isAnimationActive={false} />
              <Bar dataKey="Cash out" fill="#eb6834" radius={[3, 3, 0, 0]} barSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unbilled delivered job orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.unbilledDeliveredJobOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting to be invoiced.</p>
            ) : (
              data.unbilledDeliveredJobOrders.slice(0, 8).map((jo) => (
                <div key={jo.id} className="flex items-center justify-between text-sm">
                  <Link href={`/job-orders/${jo.id}`} className="font-medium hover:underline">
                    {jo.joNumber}
                  </Link>
                  <span className="text-xs text-muted-foreground">{jo.clientName ?? "—"} · {formatCentavos(jo.totalCentavos)}</span>
                </div>
              ))
            )}
            <Link href="/accounting/invoices" className="inline-block pt-1 text-xs text-primary hover:underline">
              Go to invoices →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments received this week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.paymentsThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded this week.</p>
            ) : (
              data.paymentsThisWeek.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.clientName ?? "—"}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatCentavos(p.amountCentavos)} · {formatDate(p.paymentDate)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expenses this month, by category</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.expensesThisMonthByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses logged this month.</p>
            ) : (
              data.expensesThisMonthByCategory.map((c) => (
                <div key={c.category}>
                  <p className="text-xs text-muted-foreground capitalize">{c.category}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCentavos(c.totalCentavos)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
