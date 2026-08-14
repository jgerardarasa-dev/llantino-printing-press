import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SimpleColumn<T> = { header: string; cell: (row: T) => React.ReactNode; align?: "right" };

/**
 * A plain table — deliberately NOT a "use client" component. It exists
 * to be called from a Server Component (a page) to build ready-made
 * JSX that then gets handed to a Client Component (ChartCard) as a
 * prop. The column definitions here carry functions (`cell`), and
 * functions can't cross the Server -> Client boundary as a prop value —
 * but a Server Component's *already-rendered output* can (same rule
 * that governs passing `children` from a Server Component into a
 * Client Component). By the time this returns, every `cell(row)` call
 * has already happened and been replaced with its plain result, so
 * what crosses the boundary is ordinary JSX, never a function.
 */
export function SimpleDataTable<T>({
  data,
  columns,
  emptyMessage = "No data for this range.",
  rowKey,
}: {
  data: T[];
  columns: SimpleColumn<T>[];
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => React.Key;
}) {
  return (
    <div className="rounded-lg border border-border">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} className={c.align === "right" ? "text-right" : undefined}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-20 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={rowKey ? rowKey(row, i) : i}>
                {columns.map((c) => (
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
  );
}
