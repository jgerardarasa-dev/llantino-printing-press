import { JOB_ORDER_STAGES, type JobOrderStage } from "@/lib/constants/job-order-stages";

/**
 * The main pipeline, in order — everything except the terminal
 * `cancelled` stage. SPEC §6 models `cancelled` as an orthogonal flag
 * "reachable from any stage"; this schema models it as a terminal value
 * of the same `stage` enum instead of a separate boolean (simpler: one
 * column is the single source of truth for "where is this JO", and
 * `cancelled_reason` still captures why). The effect is identical — a
 * cancelled JO can never move again — just implemented as a terminal
 * node in the sequence rather than a side flag.
 */
export const STAGE_SEQUENCE: JobOrderStage[] = JOB_ORDER_STAGES.filter(
  (s): s is Exclude<JobOrderStage, "cancelled"> => s !== "cancelled"
);

const TERMINAL_STAGES: ReadonlySet<JobOrderStage> = new Set(["cancelled", "closed"]);

export class IllegalTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalTransitionError";
  }
}

export type TransitionDirection = "forward" | "backward" | "cancel";

export type TransitionGateContext = {
  /** artwork_approval -> prepress: a `proof` attachment + a recorded client approval. */
  hasProofApproval?: boolean;
  /** quality_check -> packing: every jo_checklists row for this JO is done. */
  allChecklistItemsDone?: boolean;
  /** delivered -> invoiced: a deliveries row with delivered_at set exists. */
  hasCompletedDelivery?: boolean;
};

function stageIndex(stage: JobOrderStage): number {
  return STAGE_SEQUENCE.indexOf(stage as (typeof STAGE_SEQUENCE)[number]);
}

/**
 * Throws IllegalTransitionError on anything not allowed; returns the
 * direction otherwise so the caller (Server Action) knows whether a
 * note is mandatory (backward) or a gate needs checking.
 *
 * Legal moves:
 *  - forward exactly one step in STAGE_SEQUENCE
 *  - backward exactly one step ("rework" — always requires a note)
 *  - to `cancelled` from any non-terminal stage
 * Nothing is legal once at a terminal stage (`cancelled`, `closed`).
 */
export function assertValidTransition(
  fromStage: JobOrderStage,
  toStage: JobOrderStage,
  gates: TransitionGateContext = {}
): TransitionDirection {
  if (fromStage === toStage) {
    throw new IllegalTransitionError(`Job order is already at "${fromStage}".`);
  }
  if (TERMINAL_STAGES.has(fromStage)) {
    throw new IllegalTransitionError(`Job order is "${fromStage}" and cannot move any further.`);
  }

  if (toStage === "cancelled") {
    return "cancel";
  }

  const fromIdx = stageIndex(fromStage);
  const toIdx = stageIndex(toStage);
  if (fromIdx === -1 || toIdx === -1) {
    throw new IllegalTransitionError(`"${fromStage}" -> "${toStage}" is not a valid stage pair.`);
  }

  if (toIdx === fromIdx + 1) {
    checkForwardGate(fromStage, toStage, gates);
    return "forward";
  }

  if (toIdx === fromIdx - 1) {
    return "backward";
  }

  throw new IllegalTransitionError(
    `Cannot jump from "${fromStage}" to "${toStage}" — stages advance one at a time (or move back one step for rework).`
  );
}

function checkForwardGate(fromStage: JobOrderStage, toStage: JobOrderStage, gates: TransitionGateContext) {
  if (fromStage === "artwork_approval" && toStage === "prepress" && !gates.hasProofApproval) {
    throw new IllegalTransitionError(
      "Attach the client-approved proof and record the client's approval before moving to prepress."
    );
  }
  if (fromStage === "quality_check" && toStage === "packing" && !gates.allChecklistItemsDone) {
    throw new IllegalTransitionError("Every QC checklist item must be checked off before packing.");
  }
  if (fromStage === "delivered" && toStage === "invoiced" && !gates.hasCompletedDelivery) {
    throw new IllegalTransitionError("Record a completed delivery (with a delivered-at date) before invoicing.");
  }
}

export function canCancel(stage: JobOrderStage): boolean {
  return !TERMINAL_STAGES.has(stage);
}

export function nextStage(stage: JobOrderStage): JobOrderStage | null {
  const idx = stageIndex(stage);
  if (idx === -1 || idx === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[idx + 1];
}

export function previousStage(stage: JobOrderStage): JobOrderStage | null {
  const idx = stageIndex(stage);
  if (idx <= 0) return null;
  return STAGE_SEQUENCE[idx - 1];
}
