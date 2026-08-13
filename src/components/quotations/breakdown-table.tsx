"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import type { LineOverride, QuoteBreakdown } from "@/lib/pricing/types";
import { formatCentavos } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Full line-by-line cost breakdown with each component's share of direct
 * cost (SPEC §7: "Sales must be able to see why a box costs ₱14.20 and
 * defend it to a client"). `onOverrideChange` is omitted for read-only
 * display (e.g. a sent/approved quotation showing its frozen snapshot).
 */
export function BreakdownTable({
  breakdown,
  onOverrideChange,
}: {
  breakdown: QuoteBreakdown;
  onOverrideChange?: (key: string, override: LineOverride | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">% of direct cost</TableHead>
              {onOverrideChange && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell>
                  <span>{line.label}</span>
                  {line.isOverridden && (
                    <Badge variant="warning" className="ml-2 align-middle">
                      Overridden
                    </Badge>
                  )}
                  {line.isOverridden && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Was {formatCentavos(line.computedAmountCentavos)} — {line.overrideReason}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCentavos(line.amountCentavos)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {line.pctOfDirectCost.toFixed(1)}%
                </TableCell>
                {onOverrideChange && (
                  <TableCell>
                    <OverrideControl line={line} onOverrideChange={onOverrideChange} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="ml-auto grid max-w-xs grid-cols-2 gap-y-1.5 text-sm">
        <span className="text-muted-foreground">Sheets needed</span>
        <span className="text-right tabular-nums">{breakdown.sheets.totalSheets.toLocaleString()}</span>
        <span className="text-muted-foreground">Direct cost</span>
        <span className="text-right tabular-nums">{formatCentavos(breakdown.directCostCentavos)}</span>
        <span className="text-muted-foreground">Overhead</span>
        <span className="text-right tabular-nums">{formatCentavos(breakdown.overheadCentavos)}</span>
        <span className="text-muted-foreground">Total cost</span>
        <span className="text-right tabular-nums">{formatCentavos(breakdown.totalCostCentavos)}</span>
        <span className="text-muted-foreground">Markup ({breakdown.markupPct}%)</span>
        <span className="text-right tabular-nums">
          {formatCentavos(breakdown.sellingPriceCentavos - breakdown.totalCostCentavos)}
        </span>
        <span className="font-medium">Selling price</span>
        <span className="text-right font-medium tabular-nums">{formatCentavos(breakdown.sellingPriceCentavos)}</span>
        <span className="text-muted-foreground">Unit price</span>
        <span className="text-right tabular-nums">{formatCentavos(breakdown.unitPriceCentavos)}</span>
        <span className="text-muted-foreground">VAT</span>
        <span className="text-right tabular-nums">{formatCentavos(breakdown.vatCentavos)}</span>
        <span className="text-base font-semibold">Grand total</span>
        <span className="text-right text-base font-semibold tabular-nums">
          {formatCentavos(breakdown.grandTotalCentavos)}
        </span>
      </div>

      {breakdown.requiresApproval && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium text-warning-foreground">Requires management approval</p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {breakdown.approvalReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OverrideControl({
  line,
  onOverrideChange,
}: {
  line: QuoteBreakdown["lines"][number];
  onOverrideChange: (key: string, override: LineOverride | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(line.amountCentavos / 100));
  const [reason, setReason] = useState(line.overrideReason ?? "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6">
          <Pencil className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Override {line.label}</p>
          {line.isOverridden && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                onOverrideChange(line.key, null);
                setOpen(false);
              }}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`override-${line.key}`} className="text-xs">Amount (₱)</Label>
          <Input
            id={`override-${line.key}`}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`reason-${line.key}`} className="text-xs">Reason *</Label>
          <Input id={`reason-${line.key}`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={!reason.trim() || !amount}
          onClick={() => {
            onOverrideChange(line.key, { amountCentavos: Math.round(Number(amount) * 100), reason: reason.trim() });
            setOpen(false);
          }}
        >
          Apply override
        </Button>
      </PopoverContent>
    </Popover>
  );
}
