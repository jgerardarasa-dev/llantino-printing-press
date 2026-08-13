"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { addChecklistItem, toggleChecklistItem } from "@/lib/actions/job-order-checklist-actions";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type ChecklistRow = {
  id: string;
  stage: string;
  itemLabel: string;
  isDone: boolean;
  doneAt: string | Date | null;
};

export function ChecklistPanel({
  jobOrderId,
  currentStage,
  items,
  canEdit,
}: {
  jobOrderId: string;
  currentStage: JobOrderStage;
  items: ChecklistRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");

  if (items.length === 0 && currentStage !== "quality_check") {
    return <p className="text-sm text-muted-foreground">The QC checklist is seeded automatically once this job order reaches Quality Check.</p>;
  }

  const doneCount = items.filter((i) => i.isDone).length;

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">{doneCount} / {items.length} checked off</p>
      )}
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Checkbox
              checked={item.isDone}
              disabled={!canEdit || isPending}
              onCheckedChange={(checked) =>
                startTransition(async () => {
                  const result = await toggleChecklistItem(item.id, jobOrderId, checked === true);
                  if (result.error) toast.error(result.error);
                  else router.refresh();
                })
              }
            />
            <span className={item.isDone ? "text-sm text-muted-foreground line-through" : "text-sm"}>
              {item.itemLabel}
            </span>
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="flex gap-1.5 pt-1">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add checklist item"
            className="h-8 text-xs"
          />
          <Button
            size="icon"
            className="size-8 shrink-0"
            disabled={!newItem.trim() || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await addChecklistItem(jobOrderId, currentStage, newItem);
                if (result.error) toast.error(result.error);
                else {
                  setNewItem("");
                  router.refresh();
                }
              })
            }
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}
