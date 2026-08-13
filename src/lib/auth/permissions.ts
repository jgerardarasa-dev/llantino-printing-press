import type { UserRole } from "@/lib/constants/roles";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/** Mirrors public.is_crm_owner_role() in the RLS migration. */
export const CRM_OWNER_ROLES: UserRole[] = ["admin", "management", "sales"];
/** Mirrors public.is_commercial_role() — read access to CRM/pricing data. */
export const COMMERCIAL_ROLES: UserRole[] = ["admin", "management", "sales", "accounting"];
/**
 * Master pricing (materials, process rates) — admin only. SPEC §4:
 * "management ... cannot edit master pricing." Mirrors
 * materials_admin_write / process_rates_admin_write RLS policies.
 */
export const PRICING_ADMIN_ROLES: UserRole[] = ["admin"];
/** Box specs: commercial roles plus production (mirrors box_specs_write RLS). */
export const BOX_SPEC_ROLES: UserRole[] = ["admin", "management", "sales", "accounting", "production"];
/** HR data — employees, attendance, leave balances (mirrors employees_write_hr etc. RLS). */
export const HR_ROLES: UserRole[] = ["admin", "hr"];
/** Read access to HR/payroll-adjacent data (mirrors is_hr_or_finance_role() RLS). */
export const HR_OR_FINANCE_ROLES: UserRole[] = ["admin", "management", "hr", "accounting"];
/** Who may approve/reject a leave request. */
export const LEAVE_APPROVER_ROLES: UserRole[] = ["admin", "hr", "management"];
/** Invoices/payments/expenses write access (mirrors *_write_accounting RLS). */
export const ACCOUNTING_WRITE_ROLES: UserRole[] = ["admin", "accounting"];
/** Invoices/payments read access (mirrors invoices_select / payments_select RLS). */
export const INVOICE_READ_ROLES: UserRole[] = ["admin", "management", "accounting", "sales"];
/** Expenses read access (mirrors expenses_select RLS). */
export const EXPENSE_READ_ROLES: UserRole[] = ["admin", "management", "accounting"];
/** Company-wide dashboard (SPEC §8) and /analytics section — the rest of the roles get their own dashboard instead. */
export const MANAGEMENT_DASHBOARD_ROLES: UserRole[] = ["admin", "management"];
/** Manual ad_spend entry + the Meta Ads settings link (SPEC §8 Meta Ads section). */
export const AD_SPEND_ROLES: UserRole[] = ["admin", "management"];

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Second enforcement layer (RLS is the first, UI conditional rendering
 * is the third) — every Server Action that mutates data must re-check
 * permissions server-side, never trust that the UI only showed the
 * button to the right role. Throws ForbiddenError, which the action
 * should catch and turn into a form error rather than letting Next
 * render its default error boundary.
 */
export function assertRole(user: CurrentUser | null, allowed: UserRole[]): asserts user is CurrentUser {
  if (!user) throw new ForbiddenError("You must be signed in.");
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`This action requires one of: ${allowed.join(", ")}.`);
  }
}
