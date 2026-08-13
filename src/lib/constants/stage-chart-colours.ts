import type { JobOrderStage } from "@/lib/constants/job-order-stages";

/**
 * Chart-fill hex equivalents of STAGE_COLOURS (job-order-stages.ts).
 * SPEC §9 requires a JO stage to read as the same colour on every page —
 * the badge classes there are light pastels tuned for a small pill, not
 * saturated enough to read as a bar/line fill, so this file picks the
 * mid-tone Tailwind step of the *same* hue family per stage instead of
 * running a fresh categorical palette pick for these charts. This is a
 * deliberate, documented exception to the dataviz skill's "assign
 * categorical hues via the validator" step — the hue assignment here is
 * inherited from an existing, already-shipped product decision (badges,
 * kanban, calendar), not a new one, so re-deriving it from the skill's
 * default ramps would break the "same JO, same colour everywhere" rule
 * it's meant to preserve. See README "Key architectural notes".
 */
export const STAGE_CHART_COLOURS: Record<JobOrderStage, string> = {
  draft: "#64748b", // slate-500
  for_artwork: "#8b5cf6", // violet-500
  artwork_approval: "#a855f7", // purple-500
  prepress: "#6366f1", // indigo-500
  materials_ready: "#3b82f6", // blue-500
  printing: "#06b6d4", // cyan-500
  finishing: "#14b8a6", // teal-500
  die_cutting: "#10b981", // emerald-500
  gluing_assembly: "#22c55e", // green-500
  quality_check: "#f59e0b", // amber-500
  packing: "#f97316", // orange-500
  ready_for_delivery: "#0ea5e9", // sky-500
  delivered: "#2563eb", // blue-600
  invoiced: "#d946ef", // fuchsia-500
  paid: "#059669", // emerald-600
  closed: "#a3a3a3", // neutral-400
  cancelled: "#ef4444", // red-500
};
