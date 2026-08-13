import type { UserRole } from "@/lib/constants/roles";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/** Mirrors public.is_crm_owner_role() in the RLS migration. */
export const CRM_OWNER_ROLES: UserRole[] = ["admin", "management", "sales"];
/** Mirrors public.is_commercial_role() — read access to CRM/pricing data. */
export const COMMERCIAL_ROLES: UserRole[] = ["admin", "management", "sales", "accounting"];

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
