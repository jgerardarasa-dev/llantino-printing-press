"use client";

import { useState } from "react";

import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import { StageStepper } from "./stage-stepper";
import { AdvanceStageDialog } from "./advance-stage-dialog";

type HistoryEntry = { toStage: string; changedAt: string | Date; changedByName: string | null };

export function StageControls({
  jobOrderId,
  currentStage,
  isOnHold,
  history,
  clientPoNumber,
  canAdvance,
}: {
  jobOrderId: string;
  currentStage: JobOrderStage;
  isOnHold: boolean;
  history: HistoryEntry[];
  clientPoNumber: string | null;
  canAdvance: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <StageStepper
        currentStage={currentStage}
        isOnHold={isOnHold}
        history={history}
        onAdvanceClick={canAdvance ? () => setOpen(true) : undefined}
      />
      {canAdvance && (
        <AdvanceStageDialog
          open={open}
          onOpenChange={setOpen}
          jobOrderId={jobOrderId}
          currentStage={currentStage}
          clientPoNumber={clientPoNumber}
        />
      )}
    </>
  );
}
