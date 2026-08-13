"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { STAGE_LABELS } from "@/lib/constants/job-order-stages";
import { STAGE_CHART_COLOURS } from "@/lib/constants/stage-chart-colours";
import type { BottleneckEntry } from "@/lib/data/dashboard";

/** SPEC §8: "Bottleneck chart: average hours spent per stage over the last 90 days." */
export function BottleneckChart({ data }: { data: BottleneckEntry[] }) {
  const chartData = data.map((d) => ({ ...d, label: STAGE_LABELS[d.stage] }));

  return (
    <ResponsiveContainer width="100%" height={440}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" unit="h" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={128}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
          formatter={(value, _name, item) => {
            const row = item?.payload as (BottleneckEntry & { label: string }) | undefined;
            return [`${value}h avg (n=${row?.sampleSize ?? 0})`, "Time in stage"];
          }}
        />
        <Bar dataKey="avgHours" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {chartData.map((d) => (
            <Cell key={d.stage} fill={STAGE_CHART_COLOURS[d.stage]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
