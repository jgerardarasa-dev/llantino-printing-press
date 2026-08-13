"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildCsv, downloadCsv, type CsvColumn } from "@/lib/csv";

/** SPEC §8: "Every chart has a date-range filter and a CSV export button." */
export function CsvExportButton<T>({
  data,
  columns,
  filename,
  label = "Export CSV",
}: {
  data: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => downloadCsv(filename, buildCsv(data, columns))}
      disabled={data.length === 0}
    >
      <Download className="size-3.5" />
      {label}
    </Button>
  );
}
