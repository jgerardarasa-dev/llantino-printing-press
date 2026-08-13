"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { issueMaterial, type ActionState } from "@/lib/actions/job-order-production-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = {};

export type MaterialIssuedRow = {
  issued: {
    id: string;
    sheetsPlanned: number;
    sheetsIssued: number;
    sheetsUsed: number;
    createdAt: string | Date;
  };
  materialName: string | null;
};

export function MaterialsPanel({
  jobOrderId,
  materials,
  issued,
  canEdit,
}: {
  jobOrderId: string;
  materials: { id: string; name: string }[];
  issued: MaterialIssuedRow[];
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(issueMaterial, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Material issuance recorded");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="space-y-3">
      {canEdit && (
        <form ref={formRef} action={formAction} className="space-y-2 rounded-lg border border-border p-3">
          <input type="hidden" name="jobOrderId" value={jobOrderId} />
          <div className="space-y-1">
            <Label htmlFor="materialId" className="text-xs">Material</Label>
            <Select name="materialId">
              <SelectTrigger id="materialId" size="sm" className="w-full">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="sheetsPlanned" className="text-xs">Planned</Label>
              <Input id="sheetsPlanned" name="sheetsPlanned" type="number" min={0} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sheetsIssued" className="text-xs">Issued</Label>
              <Input id="sheetsIssued" name="sheetsIssued" type="number" min={0} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sheetsUsed" className="text-xs">Used</Label>
              <Input id="sheetsUsed" name="sheetsUsed" type="number" min={0} className="h-8 text-xs" />
            </div>
          </div>
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Record issuance
          </Button>
        </form>
      )}

      <ul className="space-y-1.5">
        {issued.map(({ issued: row, materialName }) => (
          <li key={row.id} className="rounded-md border border-border p-2 text-xs">
            <p className="font-medium">{materialName ?? "—"}</p>
            <p className="text-muted-foreground tabular-nums">
              Planned {row.sheetsPlanned.toLocaleString()} · Issued {row.sheetsIssued.toLocaleString()} · Used {row.sheetsUsed.toLocaleString()}
            </p>
          </li>
        ))}
        {issued.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No materials issued yet.</p>}
      </ul>
    </div>
  );
}
