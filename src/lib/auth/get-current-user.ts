import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/constants/roles";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isManager: boolean;
  department: string | null;
  avatarUrl: string | null;
};

/**
 * Resolves the logged-in Supabase auth user to their `public.users` row
 * (full name, role, etc). Cached per request. Returns null when there is
 * no session or the users row hasn't been provisioned yet — callers in
 * protected layouts should redirect to /login in that case.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [row] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!row || !row.isActive || row.deletedAt) return null;

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    isManager: row.isManager,
    department: row.department,
    avatarUrl: row.avatarUrl,
  };
});
