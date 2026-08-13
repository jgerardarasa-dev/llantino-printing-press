# Llantino Ops

Internal operations platform for Llantino Printing Press. See
[`SPEC.md`](./SPEC.md) for the full build specification.

**Status:** Milestones 0–5 are built (Foundation, Data layer, CRM,
Pricing engine, Quotations, Job Orders). Everything else in `SPEC.md`
§10 is intentionally not started yet — each remaining milestone (Tasks +
Calendar, HR, Accounting, Dashboards, Polish) is its own future pass.
Nav links to those areas render a "coming in Milestone N" screen rather
than a broken page.

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
      quotations/             builder, list, detail, edit, PDF route —
                               Milestone 4
      job-orders/             list + detail (stage stepper, production
                               logs, materials, QC checklist, deliveries)
                               — Milestone 5
      deliveries/[id]/pdf/     DR PDF route (the /deliveries list page
                               itself is still a placeholder — delivery
                               management lives on the JO detail page)
      tasks/ calendar/ hr/* accounting/* analytics/ settings/
                          — placeholder pages, one per future milestone
  components/
    ui/                   hand-ported shadcn/ui primitives
    layout/                sidebar, topbar, nav config, breadcrumb
    crm/                   contact/interaction forms + lists (Milestone 2)
    quotations/             breakdown table, tier tables, action buttons
                             (Milestone 4)
    job-orders/              stage stepper + advance dialog, hold/cancel,
                             production logs, materials, checklist,
                             deliveries, activity timeline, comments
                             (Milestone 5)
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
    pdf/                     @react-pdf/renderer documents — quotation
                              (+ props-builder shared with the email
                              action, Milestone 4) and delivery receipt
                              (Milestone 5)
    job-orders/state-machine.ts  the transition map (SPEC §6): legal
                                  moves, gated transitions, cancellation;
                                  Vitest-covered
    settings/get-settings.ts  typed reader over the settings k/v table,
                               with SPEC §13's placeholder defaults baked
                               in so the app runs before those decisions
                               are confirmed (Milestone 4)
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
- **The quotation builder's live breakdown is a client-side preview
  only.** `saveQuotationDraft` never trusts a client-submitted cost
  breakdown — it re-fetches the box spec/material/process rates/settings
  fresh from the DB inside the Server Action and re-runs `computeQuote`
  itself before persisting. The client-computed numbers exist purely so
  sales sees live feedback while typing.
- **One item per quotation for now.** `quotation_items` is a real table
  that can hold many rows, but the builder UI only creates one — a
  quotation for a single box spec. Multi-line quotations (several
  different products in one quote) are a clean extension of the same
  data model, just not built yet.
- **`sendOrSubmitQuotation` is one button that routes itself**: from
  `draft`, it goes to `pending_approval` if the stored breakdown's
  `requiresApproval` is true, otherwise straight to `sent`; from
  `approved`, it always sends. Matches SPEC §7's "cannot be sent until a
  management user approves" without making sales pick the right button.
- **Quotation `expired` status is computed at display time, not
  persisted.** A `sent`/`approved` quote past its `validUntil` shows an
  "Expired" badge everywhere, but the DB row keeps its real status —
  nothing mutates data on a GET request. Revisit if a background job
  (or Milestone 9's dashboard) ends up needing the persisted state.
- **`RESEND_API_KEY` unset → email send fails gracefully**, not a crash:
  `emailQuotation` returns a clear error toast instead. PDF download
  works either way since it doesn't touch Resend.
- **`cancelled` is a terminal value of the `stage` enum, not a separate
  boolean flag.** SPEC §6 describes `on_hold` and `cancelled` as two
  orthogonal flags "reachable from any stage." `on_hold` is modeled that
  way (`is_on_hold` + `hold_reason`, independent of `stage`), but
  `cancelled` is modeled as the last stop in the same `stage` column
  instead — one column stays the single source of truth for "where is
  this job order," and `cancelled_reason` still captures why. The
  observable behavior (terminal, requires a reason, requires
  admin/management) is identical either way.
- **jo_stage_history's trigger is the ground truth; the TS state
  machine (`lib/job-orders/state-machine.ts`) is what makes a transition
  legal in the first place.** The trigger fires unconditionally on any
  stage change and can't be bypassed — but it doesn't validate anything,
  it only records. `advanceJobOrderStage` calls `assertValidTransition`
  *before* issuing the UPDATE; the rework note reaches the trigger via a
  session-local Postgres setting (`set_config('llantino.stage_note', ...,
  true)`) set in the same transaction, since job_orders has no column of
  its own to carry a per-transition note.
- **The `artwork_approval → prepress` gate is client-approval-by-form,
  not by attachment.** SPEC §6 asks for "an attachment of kind `proof`
  and a recorded client approval (name + date)" — file upload isn't
  wired up yet (see the Attachments card on the JO detail page), so the
  gate is satisfied by recording the approver's name and date through
  the advance-stage dialog instead. Revisit once Storage is wired.
- **Comments are plain text.** SPEC's "comments with @mentions" — the
  thread itself works (any signed-in user, any entity), but there's no
  @mention autocomplete or resulting notification yet; `mentions` is
  always saved empty.
- **Production's price/contact hiding happens at the data-fetcher level**
  (`getJobOrderDetail`/`listJobOrders` null out `unitPriceCentavos`,
  `totalCentavos`, and non-name client fields before the Server
  Component ever renders), not just by hiding a column in the UI —
  the strongest of SPEC §4's three enforcement layers for this rule.
