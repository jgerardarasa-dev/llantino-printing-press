import "server-only";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle client for typed SQL against Supabase Postgres. Uses the
 * transaction-pooler-friendly `postgres-js` driver. Server-only — never
 * import this in a Client Component.
 *
 * The real connection is created lazily, on first query, not at module
 * import time. Every (app) route transitively imports this module via
 * getCurrentUser(), and Next's build-time "collect page data" pass loads
 * every route module — if connecting (or even just reading
 * `DATABASE_URL`) happened at import time, `pnpm build` would fail
 * without a live database configured. Deferring it lets typecheck/lint/
 * build succeed in environments (like CI, or this one) that don't have a
 * Supabase project wired up yet; the error still surfaces clearly the
 * moment a request actually tries to run a query.
 */
declare global {
  var __llantinoDbClient: ReturnType<typeof postgres> | undefined;
  var __llantinoDb: PostgresJsDatabase<typeof schema> | undefined;
}

function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalThis.__llantinoDb) return globalThis.__llantinoDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }

  const client = globalThis.__llantinoDbClient ?? postgres(url, { prepare: false });
  const instance = drizzle(client, { schema });

  // Reuse the connection across hot reloads in dev.
  if (process.env.NODE_ENV !== "production") {
    globalThis.__llantinoDbClient = client;
    globalThis.__llantinoDb = instance;
  }

  return instance;
}

export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb() as object, prop, receiver);
    },
  }
);

/**
 * Runs `fn` inside a transaction that reproduces the Postgres session
 * context Supabase's PostgREST layer normally sets up, so RLS policies
 * that call `auth.uid()` / `auth.role()` work for Drizzle-issued queries
 * too. Every Server Action that mutates or reads RLS-protected data
 * through Drizzle (i.e. almost all of them) should go through this
 * instead of the bare `db` export.
 *
 * `userId` is the authenticated Supabase user's id (from
 * `supabase.auth.getUser()` in the Server Action, never trust a client-
 * supplied id). Server-only paths that intentionally bypass RLS (the
 * invite-user flow, seed scripts) should use lib/supabase/admin.ts
 * instead of this helper.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
