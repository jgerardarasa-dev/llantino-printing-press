/**
 * Client-side CSV export — no server round trip. SPEC §8: "Every chart
 * has a date-range filter and a CSV export button." Deliberately has no
 * "server-only" import so it can be called straight from "use client"
 * chart/table components.
 */
export type CsvColumn<T> = { header: string; accessor: (row: T) => string | number | null | undefined };

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.accessor(row))).join(",")).join("\n");
  return `${header}\n${body}`;
}

/** Triggers a browser download of `csv` as `filename` via a throwaway Blob URL. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
