import { defineConfig, devices } from "@playwright/test";

/**
 * SPEC §10: "Playwright happy path: lead → quote → approve → JO →
 * produce → deliver → invoice → paid." See README's Milestone 10 notes
 * for why this suite has never actually been run in this environment —
 * there is no live Supabase project connected here, and the whole app
 * requires one (auth, every query, RLS).
 *
 * `executablePath` points at this sandbox's pre-installed Chromium
 * (see AGENTS.md / the environment's own instructions: "do not run
 * `playwright install`"). On a machine with a matching browser already
 * installed via `playwright install`, or in CI with its own Playwright
 * setup, delete this override and let Playwright manage the browser
 * itself.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
        },
      },
    },
  ],
  // Requires a full .env (DATABASE_URL, Supabase keys) and a seeded DB —
  // `pnpm seed:users && pnpm seed:data` — neither of which exist in this
  // sandbox. `pnpm build && pnpm start` rather than `pnpm dev` so the
  // suite runs against a production build, closer to what ships.
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
