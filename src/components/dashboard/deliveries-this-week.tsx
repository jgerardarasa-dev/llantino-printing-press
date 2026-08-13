import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { DeliveryThisWeek } from "@/lib/data/dashboard";

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "warning"> = {
  scheduled: "outline",
  out_for_delivery: "warning",
};

/** SPEC §8: "Deliveries scheduled this week." */
export function DeliveriesThisWeek({ rows }: { rows: DeliveryThisWeek[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No deliveries scheduled this week.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <Link href={`/job-orders/${d.jobOrderId}`} className="font-medium hover:underline">
              {d.drNumber}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {d.joNumber ?? "—"} · {d.clientName ?? "—"} · {d.quantity.toLocaleString()} pcs
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">{formatDate(d.scheduledDate)}</span>
            <Badge variant={STATUS_VARIANT[d.status] ?? "outline"} className="capitalize">
              {d.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
