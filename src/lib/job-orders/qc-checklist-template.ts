/**
 * Default QC checklist seeded the first time a job order reaches
 * quality_check (SPEC §6: "quality_check -> packing requires all
 * jo_checklists rows for that JO to be is_done"). Generic enough for
 * most paperboard box jobs; production can still add/remove items on a
 * specific JO before checking them off.
 */
export const QC_CHECKLIST_TEMPLATE = [
  "Print registration is within tolerance",
  "Colour match approved against proof",
  "Die-cut accuracy — no tearing or misalignment",
  "Correct quantity counted",
  "No visible defects (scuffs, scratches, warping)",
  "Box assembles/folds correctly",
] as const;
