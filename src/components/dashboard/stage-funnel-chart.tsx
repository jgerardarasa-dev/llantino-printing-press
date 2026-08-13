"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { STAGE_LABELS } from "@/lib/constants/job-order-stages";
import { STAGE_CHART_COLOURS } from "@/lib/constants/stage-chart-colours";
import { formatCentavos } from "@/lib/format";
import type { StageFunnelEntry } from "@/lib/data/dashboard";

/** SPEC §8: "JO pipeline funnel: count and peso value at each stage." */
export function StageFunnelChart({ data }: { data: StageFunnelEntry[] }) {
  const hideCommercials = data.some((d) => d.valueCentavos === null);
  const chartData = data.map((d) => ({ ...d, label: STAGE_LABELS[d.stage] }));

  return (
    <ResponsiveContainer width="100%" height={440}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
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
            const row = item?.payload as (StageFunnelEntry & { label: string }) | undefined;
            const parts = [`${value} JO${value === 1 ? "" : "s"}`];
            if (!hideCommercials && row?.valueCentavos !== null && row?.valueCentavos !== undefined) {
              parts.push(formatCentavos(row.valueCentavos));
            }
            return [parts.join(" · "), "Pipeline"];
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {chartData.map((d) => (
            <Cell key={d.stage} fill={STAGE_CHART_COLOURS[d.stage]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
