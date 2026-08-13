import "server-only";
import { eq, inArray } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/** For "account owner" / "assigned to" dropdowns on CRM forms. */
export async function listAssignableOwners(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(inArray(users.role, ["admin", "management", "sales"]))
      .orderBy(users.fullName)
  );
}

/** For task assignment / calendar attendees — any active user, any role. */
export async function listActiveUsers(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({ id: users.id, fullName: users.fullName, role: users.role, department: users.department })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.fullName)
  );
}
