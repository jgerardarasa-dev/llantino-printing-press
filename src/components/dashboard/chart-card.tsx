"use client";

import { useState } from "react";
import { BarChart3, Table as TableIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvExportButton } from "@/components/shared/csv-export-button";
import type { CsvColumn } from "@/lib/csv";

type TableColumn<T> = { header: string; cell: (row: T) => React.ReactNode; align?: "right" };

/**
 * Every analytics/dashboard visual goes through this shell: a title, a
 * CSV export button (SPEC §8 non-negotiable), and — when `children` is a
 * chart — a chart/table toggle so the same data is always available as
 * plain rows (dataviz skill accessibility pass: "a table view exists").
 * When there's no `children` (a section that's a table by design, e.g.
 * "revenue by client"), it just renders the table with no toggle.
 */
export function ChartCard<T>({
  title,
  description,
  csvFilename,
  csvColumns,
  data,
  tableColumns,
  children,
}: {
  title: string;
  description?: string;
  csvFilename: string;
  csvColumns: CsvColumn<T>[];
  data: T[];
  tableColumns: TableColumn<T>[];
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
          <CsvExportButton data={data} columns={csvColumns} filename={csvFilename} />
        </div>
      </CardHeader>
      <CardContent>
        {view === "chart" && children ? (
          children
        ) : (
          <div className="rounded-lg border border-border">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  {tableColumns.map((c) => (
                    <TableHead key={c.header} className={c.align === "right" ? "text-right" : undefined}>
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColumns.length} className="h-20 text-center text-sm text-muted-foreground">
                      No data for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, i) => (
                    <TableRow key={i}>
                      {tableColumns.map((c) => (
                        <TableCell key={c.header} className={c.align === "right" ? "text-right tabular-nums" : undefined}>
                          {c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
