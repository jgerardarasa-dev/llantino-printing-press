import { formatInTimeZone } from "date-fns-tz";

const MANILA_TZ = "Asia/Manila";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

/**
 * All money is stored as integer centavos — format for display only,
 * never do arithmetic on the formatted string. `₱1,234.56` everywhere,
 * per SPEC §9.
 */
export function formatCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return pesoFormatter.format(centavos / 100);
}

/** Display in Asia/Manila regardless of the server/client's local zone. */
export function formatDate(value: string | Date | null | undefined, pattern = "MMM d, yyyy"): string {
  if (!value) return "—";
  return formatInTimeZone(value, MANILA_TZ, pattern);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "MMM d, yyyy h:mm a");
}

export function formatRelativeDays(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const target = new Date(value);
  const now = new Date();
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
