/**
 * Milestone 0 seed: 8 demo users covering all 7 roles, via the Supabase
 * Admin API (invite-only — there is no public sign-up route). Creates
 * the auth.users row AND the matching public.users row for each.
 *
 * Usage:
 *   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed:users
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";

import { users } from "../src/db/schema";
import type { UserRole } from "../src/lib/constants/roles";

const DEMO_PASSWORD = "Llantino2026!";

type DemoUser = {
  email: string;
  fullName: string;
  role: UserRole;
  isManager: boolean;
  department: string;
  phone: string;
};

const DEMO_USERS: DemoUser[] = [
  { email: "admin@llantino.ph", fullName: "Ana Llantino", role: "admin", isManager: true, department: "Admin", phone: "+63 917 000 0001" },
  { email: "management@llantino.ph", fullName: "Ramon Llantino", role: "management", isManager: true, department: "Management", phone: "+63 917 000 0002" },
  { email: "sales1@llantino.ph", fullName: "Grace Santos", role: "sales", isManager: false, department: "Sales", phone: "+63 917 000 0003" },
  { email: "sales2@llantino.ph", fullName: "Miguel Cruz", role: "sales", isManager: false, department: "Sales", phone: "+63 917 000 0004" },
  { email: "production@llantino.ph", fullName: "Boy Reyes", role: "production", isManager: true, department: "Production", phone: "+63 917 000 0005" },
  { email: "accounting@llantino.ph", fullName: "Liza Fernandez", role: "accounting", isManager: false, department: "Accounting", phone: "+63 917 000 0006" },
  { email: "hr@llantino.ph", fullName: "Carmela Uy", role: "hr", isManager: false, department: "HR", phone: "+63 917 000 0007" },
  { email: "staff@llantino.ph", fullName: "Jun Aquino", role: "staff", isManager: false, department: "Production", phone: "+63 917 000 0008" },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL. See .env.example."
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);

  console.log(`Seeding ${DEMO_USERS.length} demo users...`);

  for (const demo of DEMO_USERS) {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    let authUserId = existing.users.find((u) => u.email === demo.email)?.id;

    if (!authUserId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demo.fullName },
      });
      if (error || !data.user) {
        throw new Error(`Failed to create auth user ${demo.email}: ${error?.message}`);
      }
      authUserId = data.user.id;
      console.log(`  created auth user  ${demo.email}`);
    } else {
      console.log(`  auth user exists   ${demo.email}`);
    }

    await db
      .insert(users)
      .values({
        id: authUserId,
        fullName: demo.fullName,
        email: demo.email,
        phone: demo.phone,
        role: demo.role,
        isManager: demo.isManager,
        department: demo.department,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          fullName: demo.fullName,
          role: demo.role,
          isManager: demo.isManager,
          department: demo.department,
          phone: demo.phone,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    console.log(`  synced public.users ${demo.email} (${demo.role})`);
  }

  console.log("\nDone. Demo password for every account:", DEMO_PASSWORD);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
