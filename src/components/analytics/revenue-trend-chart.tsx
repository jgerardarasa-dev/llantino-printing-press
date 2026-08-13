"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCentavos } from "@/lib/format";
import type { RevenueByMonth } from "@/lib/data/analytics";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit", timeZone: "Asia/Manila" });

/** SPEC §8: "Revenue by month." Single series → default sequential hue (blue), no legend needed. */
export function RevenueTrendChart({ data }: { data: RevenueByMonth[] }) {
  const chartData = data.map((d) => ({ ...d, label: MONTH_FORMAT.format(new Date(d.month)) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ left: 4, right: 16, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₱${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
          formatter={(value) => [formatCentavos(Number(value)), "Revenue"]}
        />
        <Line
          type="monotone"
          dataKey="revenueCentavos"
          stroke="#2a78d6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#2a78d6", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
