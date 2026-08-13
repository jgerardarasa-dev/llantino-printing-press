"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { STAGE_LABELS, type JobOrderStage } from "@/lib/constants/job-order-stages";
import { STAGE_CHART_COLOURS } from "@/lib/constants/stage-chart-colours";
import type { WasteRateRow } from "@/lib/data/analytics";

/** SPEC §8: "Waste rate by stage." Coloured by stage, consistent with every other stage-keyed chart. */
export function WasteRateByStageChart({ data }: { data: WasteRateRow[] }) {
  const chartData = data.map((d) => ({
    ...d,
    stage: d.label as JobOrderStage,
    label: STAGE_LABELS[d.label as JobOrderStage] ?? d.label,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" unit="%" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
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
            const row = item?.payload as (WasteRateRow & { label: string }) | undefined;
            return [`${value}% (${row?.wasteCount ?? 0} waste / ${row?.goodOutput ?? 0} good)`, "Waste rate"];
          }}
        />
        <Bar dataKey="wasteRatePct" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {chartData.map((d) => (
            <Cell key={d.stage} fill={STAGE_CHART_COLOURS[d.stage] ?? "#2a78d6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
