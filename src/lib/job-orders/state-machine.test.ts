import { describe, expect, it } from "vitest";

import { assertValidTransition, canCancel, IllegalTransitionError, nextStage, previousStage, STAGE_SEQUENCE } from "./state-machine";

describe("state machine — forward moves", () => {
  it("allows moving one step forward", () => {
    expect(assertValidTransition("draft", "for_artwork")).toBe("forward");
    expect(assertValidTransition("printing", "finishing")).toBe("forward");
  });

  it("rejects skipping a stage", () => {
    expect(() => assertValidTransition("draft", "prepress")).toThrow(IllegalTransitionError);
  });

  it("rejects moving to the same stage", () => {
    expect(() => assertValidTransition("printing", "printing")).toThrow(IllegalTransitionError);
  });
});

describe("state machine — backward moves (rework)", () => {
  it("allows moving exactly one step back", () => {
    expect(assertValidTransition("finishing", "printing")).toBe("backward");
  });

  it("rejects jumping back more than one step", () => {
    expect(() => assertValidTransition("packing", "printing")).toThrow(IllegalTransitionError);
  });
});

describe("state machine — gated transitions", () => {
  it("blocks artwork_approval -> prepress without a recorded proof approval", () => {
    expect(() => assertValidTransition("artwork_approval", "prepress")).toThrow(/proof/);
    expect(assertValidTransition("artwork_approval", "prepress", { hasProofApproval: true })).toBe("forward");
  });

  it("blocks quality_check -> packing until every checklist item is done", () => {
    expect(() => assertValidTransition("quality_check", "packing")).toThrow(/checklist/);
    expect(assertValidTransition("quality_check", "packing", { allChecklistItemsDone: true })).toBe("forward");
  });

  it("blocks delivered -> invoiced without a completed delivery", () => {
    expect(() => assertValidTransition("delivered", "invoiced")).toThrow(/deliver/i);
    expect(assertValidTransition("delivered", "invoiced", { hasCompletedDelivery: true })).toBe("forward");
  });
});

describe("state machine — cancellation", () => {
  it("allows cancelling from any non-terminal stage", () => {
    expect(assertValidTransition("draft", "cancelled")).toBe("cancel");
    expect(assertValidTransition("quality_check", "cancelled")).toBe("cancel");
    expect(canCancel("printing")).toBe(true);
  });

  it("rejects cancelling an already-terminal job order", () => {
    expect(() => assertValidTransition("cancelled", "for_artwork")).toThrow(IllegalTransitionError);
    expect(() => assertValidTransition("closed", "cancelled")).toThrow(IllegalTransitionError);
    expect(canCancel("closed")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });
});

describe("state machine — terminal stages", () => {
  it("rejects any move out of closed", () => {
    expect(() => assertValidTransition("closed", "paid")).toThrow(IllegalTransitionError);
  });
});

describe("nextStage / previousStage", () => {
  it("walks the full sequence forward and back", () => {
    expect(nextStage("draft")).toBe("for_artwork");
    expect(nextStage("closed")).toBeNull();
    expect(previousStage("for_artwork")).toBe("draft");
    expect(previousStage("draft")).toBeNull();
  });

  it("covers every stage in STAGE_SEQUENCE with a consistent walk", () => {
    for (let i = 0; i < STAGE_SEQUENCE.length - 1; i++) {
      expect(nextStage(STAGE_SEQUENCE[i])).toBe(STAGE_SEQUENCE[i + 1]);
    }
  });
});
