/**
 * Seven roles, per SPEC §4. A user has one primary role plus an
 * `is_manager` boolean. Keep this list in sync with the `user_role`
 * Postgres enum in db/schema/enums.ts.
 */
export const USER_ROLES = [
  "admin",
  "management",
  "sales",
  "production",
  "accounting",
  "hr",
  "staff",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  management: "Management",
  sales: "Sales",
  production: "Production",
  accounting: "Accounting",
  hr: "HR",
  staff: "Staff",
};

/**
 * Not currently wired to a redirect or the nav — Milestone 9 kept a single
 * `/dashboard` route with role-conditional server-rendered content (see
 * `app/(app)/dashboard/page.tsx`) instead of real per-role URLs, so every
 * role's sidebar "Dashboard" link points at `/dashboard` and the page
 * itself picks the right widget set from `user.role`. Left here in case a
 * later milestone (deep-linkable role dashboards, per-role bookmarks)
 * wants real routes instead.
 */
export const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  admin: "/dashboard",
  management: "/dashboard",
  sales: "/dashboard/sales",
  production: "/dashboard/production",
  accounting: "/dashboard/accounting",
  hr: "/dashboard/hr",
  staff: "/dashboard/staff",
};

/**
 * Critical rule (SPEC §4): production must never see selling price, client
 * margin, or client contact info. Callers should check this before
 * rendering commercial figures.
 */
export function canSeeCommercials(role: UserRole): boolean {
  return role !== "production";
}

export function canSeeHrAndPayroll(role: UserRole): boolean {
  return role === "admin" || role === "management" || role === "hr" || role === "accounting";
}
