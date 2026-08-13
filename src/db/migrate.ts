import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies every SQL file in src/db/migrations, in order, including the
 * hand-written RLS/trigger migration (drizzle-kit's migrator runs plain
 * .sql files regardless of whether they were generated or custom).
 * Run against a real Supabase project's connection string:
 *   DATABASE_URL=postgresql://... pnpm db:migrate
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations against", connectionString.replace(/:[^:@]*@/, ":****@"));
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");

  await migrationClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
