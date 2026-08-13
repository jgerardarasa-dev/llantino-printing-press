export const LEAD_STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STAGE_COLOURS: Record<LeadStage, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  quoted: "bg-amber-100 text-amber-700 border-amber-200",
  won: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};
