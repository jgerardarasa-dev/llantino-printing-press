"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { convertLeadToClient, updateLeadStage } from "@/lib/actions/lead-actions";
import { LEAD_STAGES, LEAD_STAGE_COLOURS, LEAD_STAGE_LABELS, type LeadStage } from "@/lib/constants/lead-stages";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadRow } from "@/lib/data/leads";
import { cn } from "@/lib/utils";

export function LeadsKanban({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {LEAD_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", LEAD_STAGE_COLOURS[stage])}>
                {LEAD_STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{stageLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {stageLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const [isPending, startTransition] = useTransition();

  function moveStage(stage: LeadStage) {
    const lostReason = stage === "lost" ? window.prompt("Why was this lead lost? (optional)") ?? undefined : undefined;
    startTransition(async () => {
      const result = await updateLeadStage(lead.id, stage, lostReason);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
      <p className="text-sm font-medium">{lead.name}</p>
      {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
      {lead.inquirySummary && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{lead.inquirySummary}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] capitalize">
          {lead.source.replace("_", " ")}
        </Badge>
        {lead.assignedToName && (
          <span className="text-[10px] text-muted-foreground">{lead.assignedToName}</span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(lead.createdAt)}</p>

      {lead.convertedClientId ? (
        <Link
          href={`/clients/${lead.convertedClientId}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View client <ArrowRight className="size-3" />
        </Link>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          <Select value={lead.stage} onValueChange={(v) => moveStage(v as LeadStage)} disabled={isPending}>
            <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {LEAD_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
      )}

      {lead.stage === "quoted" && !lead.convertedClientId && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 w-full text-xs"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await convertLeadToClient(lead.id);
              if (result.error) toast.error(result.error);
              else toast.success("Converted to client");
            })
          }
        >
          Convert to client
        </Button>
      )}
    </div>
  );
}
