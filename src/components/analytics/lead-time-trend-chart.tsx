"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LeadTimeTrendPoint } from "@/lib/data/analytics";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit", timeZone: "Asia/Manila" });

/** SPEC §8: "Average lead time from JO creation to delivery, trended." Second sequential hue (orange) — a distinct series from revenue. */
export function LeadTimeTrendChart({ data }: { data: LeadTimeTrendPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: MONTH_FORMAT.format(new Date(d.month)) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ left: 4, right: 16, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis unit="d" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
          formatter={(value, _name, item) => {
            const row = item?.payload as (LeadTimeTrendPoint & { label: string }) | undefined;
            return [`${value} days (n=${row?.sampleSize ?? 0})`, "Avg lead time"];
          }}
        />
        <Line
          type="monotone"
          dataKey="avgDays"
          stroke="#eb6834"
          strokeWidth={2}
          dot={{ r: 3, fill: "#eb6834", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
