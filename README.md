# Llantino Ops

Internal operations platform for Llantino Printing Press. See
[`SPEC.md`](./SPEC.md) for the full build specification.

**Status:** Milestones 0–3 are built (Foundation, Data layer, CRM,
Pricing engine). Everything else in `SPEC.md` §10 is intentionally not
started yet — each remaining milestone (Quotations, Job Orders, Tasks +
Calendar, HR, Accounting, Dashboards, Polish) is its own future pass. Nav
links to those areas render a "coming in Milestone N" screen rather than
a broken page.

## Stack

Next.js 15 (App Router, TS strict) · Supabase (Postgres, Auth, Storage) ·
Drizzle ORM · Tailwind v4 + hand-ported shadcn/ui components · Zod ·
react-hook-form · Vitest. See `SPEC.md` §2 for the rationale.

> **shadcn/ui note:** the `shadcn` CLI's registry (`ui.shadcn.com`) is
> unreachable from this environment's network policy, so the primitives
> under `src/components/ui/` were hand-written in the same style/API
> instead of `pnpm dlx shadcn add ...`. If the CLI is reachable in your
> environment, `pnpm dlx shadcn@latest add <component>` will work against
> `components.json` as normal going forward.

## Setup

1. **Create a Supabase project** (supabase.com). This provisions
   `auth.uid()`, RLS, Storage, and the `auth` schema the RLS migration
   depends on.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API.
   - `DATABASE_URL` — Project Settings → Database → Connection string
     (use the **Transaction pooler** URI, port 6543, and append
     `?sslmode=require` if your client needs it explicit).
3. Install dependencies and run migrations:
   ```bash
   pnpm install
   pnpm db:migrate      # applies src/db/migrations/*.sql in order,
                         # including the hand-written RLS/trigger migration
   ```
4. Seed demo data:
   ```bash
   pnpm seed:users   # 8 demo users, one per role (password: Llantino2026!)
   pnpm seed:data    # 15 clients, 12 materials, 20 process rates,
                      # 10 box specs, PH holidays, 25 job orders
   ```
5. ```bash
   pnpm dev
   ```
   Sign in at `/login` with any seeded account, e.g.
   `admin@llantino.ph` / `Llantino2026!`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (flat config, Next.js rules) |
| `pnpm test` | Vitest |
| `pnpm db:generate` | Diff `src/db/schema/*.ts` into a new migration |
| `pnpm db:migrate` | Apply all migrations to `DATABASE_URL` |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm seed:users` | Seed the 8 demo accounts |
| `pnpm seed:data` | Seed clients/materials/rates/box specs/holidays/JOs |

## Project layout

```
src/
  app/
    (auth)/login/        invite-only sign-in (no public sign-up route)
    (app)/                authenticated shell: sidebar, topbar, breadcrumb
      dashboard/          role-aware landing page
      clients/             list + 360 view (contacts, interactions, JOs,
                            quotations/invoices placeholders) — Milestone 2
      leads/                kanban pipeline by stage — Milestone 2
      materials/             materials / process rates / box specs admin
                              CRUD, tabbed — Milestone 3
      quotations/ job-orders/ deliveries/
      tasks/ calendar/ hr/* accounting/* analytics/ settings/
                          — placeholder pages, one per future milestone
  components/
    ui/                   hand-ported shadcn/ui primitives
    layout/                sidebar, topbar, nav config, breadcrumb
    crm/                   contact/interaction forms + lists (Milestone 2)
    shared/                DataTable, StageBadge, ComingSoon
  db/
    schema/                Drizzle tables, one file per domain (SPEC §5)
    migrations/             drizzle-kit generated SQL + the hand-written
                             RLS/trigger migration (0001_*)
    client.ts               Drizzle client + withUserContext() RLS helper
    migrate.ts               migration runner (pnpm db:migrate)
  lib/
    supabase/                browser / server / admin / middleware clients
    auth/                    getCurrentUser(), assertRole() permission guard
    actions/                 Server Actions (auth, CRM, pricing admin)
    pricing/                 computeQuote + Vitest suite, quantity tiers,
                              the rough ups-per-sheet suggestion helper
                              (Milestone 3 — pure functions, no DB access)
    constants/roles.ts        role enum, labels, default routes
    validation/entities.ts    Zod schema per entity (drizzle-zod derived)
scripts/
  seed-users.ts             Milestone 0 seed
  seed-data.ts               Milestone 1 seed
```

## Key architectural notes for whoever builds the next milestone

- **RLS + Drizzle.** Supabase's own client authenticates through
  PostgREST, which sets `request.jwt.claims` so `auth.uid()` works in RLS
  policies. Server Actions that mutate data through Drizzle (a direct
  Postgres connection) must reproduce that context or RLS silently
  no-ops — use `withUserContext(userId, fn)` from `src/db/client.ts` for
  every RLS-protected Drizzle query. The service-role admin client
  (`src/lib/supabase/admin.ts`) bypasses RLS entirely and is for trusted
  server-only paths only (user invites, seed scripts).
- **Column-level restrictions (e.g. production can't see price) are not
  RLS.** Postgres RLS filters rows, not columns. The "production must
  never see selling price / client contact info" rule (SPEC §4, §6) has
  to be enforced by the data-fetching functions and Server Actions
  themselves always excluding those columns for that role, plus the UI
  never rendering them. See the migration's header comment in
  `src/db/migrations/0001_rls_policies_and_triggers.sql`.
- **`activity_log` trigger** is live for `job_orders`, `quotations`, and
  `invoices` (the SPEC's non-negotiable three). The `jo_stage_history`
  trigger and the TS state-transition map are explicitly Milestone 5
  scope (SPEC §10) — not built yet.
- **Money** is always `bigint` centavos (`src/db/schema/_shared.ts`
  `centavos()`), read back as an ordinary JS number (safe well beyond any
  realistic peso amount) so Server Actions don't have to juggle `BigInt`.
- **Leads kanban moves stage via a `<Select>` on each card, not drag-and-
  drop.** No DnD library dependency, and it's the more reliable
  interaction at 375px anyway — a deliberate simplification, not a
  missing feature.
- **CRM writes don't insert `activity_log` rows.** SPEC's non-negotiable
  list is job_orders/quotations/invoices only (§5, §11); clients/leads/
  contacts/interactions are "encouraged to as well" but out of scope for
  now to keep Milestone 2 focused.
- **The pricing engine (`src/lib/pricing/compute-quote.ts`) does use
  JS floating-point — deliberately, once per line, always rounded back
  to an integer immediately.** "No float arithmetic" targets storage and
  running totals; percentages (spoilage, overhead, markup, VAT) are
  inherently fractional and JS has no fixed-point type, so `amount * pct
  / 100` as a double followed by a single `Math.round` is what every
  real money engine does. Every function takes integer centavos in and
  returns integer centavos out — see the comment at the top of
  `rounding.ts`.
- **`computeQuote` costs `stripping` unconditionally whenever the rate
  exists** (like gluing/packing), not as an opt-in `finishing[]` pick —
  in real production, stripping waste off a die-cut sheet isn't optional
  the way spot UV or foil stamping are. The box spec builder's finishing
  checklist excludes it (and every other reserved key) for the same
  reason.
- **Process rate `key` is immutable after creation** — it's what
  `box_specs.finishing[]` and `computeQuote`'s rate lookups reference.
  The edit form shows it read-only rather than allowing a rename that
  would silently break existing box specs.
