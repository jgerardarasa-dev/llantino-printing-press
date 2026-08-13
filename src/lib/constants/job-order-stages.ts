/**
 * Fixed semantic palette for JO stages — SPEC §9: "stage colours
 * consistent everywhere (a JO in `printing` is the same colour on the
 * dashboard, the calendar, and the list)." One source of truth here;
 * every place that renders a stage (list, board, calendar, JO detail
 * stepper) imports from this file instead of picking its own colour.
 */
export const JOB_ORDER_STAGES = [
  "draft",
  "for_artwork",
  "artwork_approval",
  "prepress",
  "materials_ready",
  "printing",
  "finishing",
  "die_cutting",
  "gluing_assembly",
  "quality_check",
  "packing",
  "ready_for_delivery",
  "delivered",
  "invoiced",
  "paid",
  "closed",
  "cancelled",
] as const;

export type JobOrderStage = (typeof JOB_ORDER_STAGES)[number];

export const STAGE_LABELS: Record<JobOrderStage, string> = {
  draft: "Draft",
  for_artwork: "For Artwork",
  artwork_approval: "Artwork Approval",
  prepress: "Prepress",
  materials_ready: "Materials Ready",
  printing: "Printing",
  finishing: "Finishing",
  die_cutting: "Die-Cutting",
  gluing_assembly: "Gluing & Assembly",
  quality_check: "Quality Check",
  packing: "Packing",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** Tailwind badge classes: bg / text / border, light-mode only (SPEC §9). */
export const STAGE_COLOURS: Record<JobOrderStage, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  for_artwork: "bg-violet-100 text-violet-700 border-violet-200",
  artwork_approval: "bg-purple-100 text-purple-700 border-purple-200",
  prepress: "bg-indigo-100 text-indigo-700 border-indigo-200",
  materials_ready: "bg-blue-100 text-blue-700 border-blue-200",
  printing: "bg-cyan-100 text-cyan-700 border-cyan-200",
  finishing: "bg-teal-100 text-teal-700 border-teal-200",
  die_cutting: "bg-emerald-100 text-emerald-700 border-emerald-200",
  gluing_assembly: "bg-green-100 text-green-700 border-green-200",
  quality_check: "bg-amber-100 text-amber-700 border-amber-200",
  packing: "bg-orange-100 text-orange-700 border-orange-200",
  ready_for_delivery: "bg-sky-100 text-sky-700 border-sky-200",
  delivered: "bg-blue-100 text-blue-800 border-blue-200",
  invoiced: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-neutral-200 text-neutral-600 border-neutral-300",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
