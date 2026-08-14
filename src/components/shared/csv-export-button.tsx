"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

/**
 * SPEC §8: "Every chart has a date-range filter and a CSV export button."
 *
 * Takes an already-built CSV string, not `data` + column-accessor
 * functions — a Server Component page builds the string with
 * `buildCsv()` (see lib/csv.ts) and passes the plain string in. Column
 * accessor functions are ordinary functions and can't cross the
 * Server -> Client prop boundary (see the nav-icons fix for the same
 * rule); only the fully-computed string can.
 */
export function CsvExportButton({
  csv,
  filename,
  label = "Export CSV",
  disabled = false,
}: {
  csv: string;
  filename: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => downloadCsv(filename, csv)}
      disabled={disabled}
    >
      <Download className="size-3.5" />
      {label}
    </Button>
  );
}
