import { sql } from "drizzle-orm";
import { bigint, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every table in the system gets: id uuid pk, created_at, updated_at,
 * deleted_at (soft delete only — nothing is ever hard-deleted from the
 * UI). `created_by` is added per-table with a reference to users.id
 * because the FK target differs (and `users` itself can't FK to itself
 * eagerly without a lazy callback).
 *
 * This is a factory, not a shared object — Drizzle column builders carry
 * per-call state, so each table must get its own fresh builder instances.
 */
export function baseColumns() {
  return {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  };
}

/**
 * All money is stored as an integer count of centavos. We use Drizzle's
 * bigint "number" mode (safe up to 2^53, far beyond any realistic peso
 * amount) instead of "bigint" mode so values stay ordinary JS numbers —
 * JSON-serializable across Server Actions without extra (de)serialization
 * — while the column itself is still a real Postgres bigint. Never use
 * `integer`/`real`/`numeric` for money.
 */
export function centavos(name: string) {
  return bigint(name, { mode: "number" });
}
