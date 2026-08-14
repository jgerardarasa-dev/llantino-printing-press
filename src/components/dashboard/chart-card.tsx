"use client";

import { useState } from "react";
import { BarChart3, Table as TableIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CsvExportButton } from "@/components/shared/csv-export-button";

/**
 * Every analytics/dashboard visual goes through this shell: a title, a
 * CSV export button (SPEC §8 non-negotiable), and — when `children` is a
 * chart — a chart/table toggle so the same data is always available as
 * plain rows (dataviz skill accessibility pass: "a table view exists").
 * When there's no `children` (a section that's a table by design, e.g.
 * "revenue by client"), it just renders `table` with no toggle.
 *
 * `csv` and `table` arrive already built (a string, and rendered JSX,
 * respectively) — see components/shared/simple-data-table.tsx and
 * lib/csv.ts's buildCsv(). The calling Server Component page builds
 * both from its column definitions; ChartCard itself never sees a
 * column-accessor function, since a function can't cross the
 * Server -> Client prop boundary this component sits behind.
 */
export function ChartCard({
  title,
  description,
  csvFilename,
  csv,
  table,
  children,
}: {
  title: string;
  description?: string;
  csvFilename: string;
  csv: string;
  table: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">(children ? "chart" : "table");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {children && (
            <>
              <Button
                type="button"
                variant={view === "chart" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("chart")}
                aria-label="Chart view"
              >
                <BarChart3 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                aria-label="Table view"
              >
                <TableIcon className="size-3.5" />
              </Button>
            </>
          )}
          <CsvExportButton csv={csv} filename={csvFilename} />
        </div>
      </CardHeader>
      <CardContent>{view === "chart" && children ? children : table}</CardContent>
    </Card>
  );
}
