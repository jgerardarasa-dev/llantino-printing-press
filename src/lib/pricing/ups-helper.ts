/**
 * Rough imposition suggestion — SPEC §7's "ups calculation note": true
 * imposition from dieline geometry is explicitly out of scope for the
 * MVP (SPEC §12). This derives an approximate flat-blank size from the
 * box style + dimensions using rule-of-thumb carton-estimating formulas,
 * then fits it against the sheet size minus a 10mm gripper margin. It is
 * a *suggestion* the estimator accepts or overrides on the box spec form
 * — never used directly by computeQuote, which only trusts the
 * ups_per_sheet the estimator actually saved.
 */

const GRIPPER_MARGIN_MM = 10;
const MM_PER_INCH = 25.4;

export type BoxStyle =
  | "straight_tuck"
  | "reverse_tuck"
  | "auto_lock_bottom"
  | "snap_lock"
  | "mailer"
  | "pizza"
  | "sleeve"
  | "tray_lid"
  | "custom";

export type UpsSuggestion = {
  flatBlankWidthMm: number;
  flatBlankHeightMm: number;
  suggestedUps: number;
};

/** Approximate flat blank footprint for a box style, in mm. */
function estimateFlatBlankMm(style: BoxStyle, lengthMm: number, widthMm: number, heightMm: number) {
  switch (style) {
    case "straight_tuck":
    case "reverse_tuck":
      return {
        width: 2 * (lengthMm + widthMm) + 15,
        height: heightMm + lengthMm,
      };
    case "auto_lock_bottom":
    case "snap_lock":
      return {
        width: 2 * (lengthMm + widthMm) + 15,
        height: heightMm + lengthMm * 0.6,
      };
    case "mailer":
    case "pizza":
    case "tray_lid":
      return {
        width: lengthMm + 2 * heightMm + 20,
        height: widthMm + 2 * heightMm + 20,
      };
    case "sleeve":
      return {
        width: 2 * (lengthMm + widthMm),
        height: heightMm,
      };
    case "custom":
    default:
      return {
        width: 2 * (lengthMm + widthMm) + 20,
        height: heightMm + lengthMm,
      };
  }
}

export function suggestUpsPerSheet(params: {
  style: BoxStyle;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  sheetWidthIn: number;
  sheetLengthIn: number;
}): UpsSuggestion {
  const { width: flatBlankWidthMm, height: flatBlankHeightMm } = estimateFlatBlankMm(
    params.style,
    params.lengthMm,
    params.widthMm,
    params.heightMm
  );

  const sheetWidthMm = params.sheetWidthIn * MM_PER_INCH - GRIPPER_MARGIN_MM;
  const sheetLengthMm = params.sheetLengthIn * MM_PER_INCH - GRIPPER_MARGIN_MM;

  const straight =
    Math.floor(sheetWidthMm / flatBlankWidthMm) * Math.floor(sheetLengthMm / flatBlankHeightMm);
  const rotated =
    Math.floor(sheetWidthMm / flatBlankHeightMm) * Math.floor(sheetLengthMm / flatBlankWidthMm);

  return {
    flatBlankWidthMm: Math.round(flatBlankWidthMm),
    flatBlankHeightMm: Math.round(flatBlankHeightMm),
    suggestedUps: Math.max(1, straight, rotated),
  };
}
