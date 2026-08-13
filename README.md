# Llantino Ops

Internal operations platform for Llantino Printing Press. See
[`SPEC.md`](./SPEC.md) for the full build specification.

**Status:** All 10 milestones in `SPEC.md` §10 are built (Foundation,
Data layer, CRM, Pricing engine, Quotations, Job Orders, Tasks +
Calendar, HR, Accounting, Dashboards + Analytics, Polish). The MVP build
is complete. No live Supabase project has been connected at any point in
this build — see "Key architectural notes" for what that means for the
Milestone 10 Playwright suite specifically.

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
      tasks/                  board (kanban/list/my-tasks) — Milestone 6
      calendar/                unified FullCalendar + JSON feed route
                               reading v_calendar_feed — Milestone 6
      hr/                      employees, attendance (+ CSV import),
                               leave requests/balances/holidays —
                               Milestone 7
      accounting/              invoice generation from delivered JOs,
                               payments + aging, expenses with JO
                               tagging, job costing report — Milestone 8
      analytics/               revenue/conversion/lead-time/waste-rate/
                               retention + CSV export — Milestone 9
        ads/                   Meta Ads manual spend entry + cost-per-lead
                               — Milestone 9
      settings/               — still a placeholder page (no module has
                               claimed the company-wide settings UI yet;
                               Meta Ads' own settings live inline on its
                               page instead, admin-gated — Milestone 9)
      notifications/           full notification list page — Milestone 10
      search/route.ts          GET /search — global search API used by
                               the ⌘K command palette — Milestone 10
    api/cron/notifications-digest/route.ts  CRON_SECRET-protected route
                               an external scheduler would hit — no
                               scheduler is configured in this
                               environment — Milestone 10
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
    calendar/                FullCalendar wrapper, layer toggles, source
                             colour map, new-event dialog (Milestone 6)
    accounting/              AgingSummary (shared between the invoices
                             page and the management dashboard —
                             Milestone 9)
    dashboard/               KpiCard, ChartCard (chart/table toggle + CSV
                             export shell), stage funnel/bottleneck
                             charts, per-role dashboard bodies (sales/
                             production/accounting/hr/staff) — Milestone 9
    analytics/               revenue/lead-time/waste-rate charts, ad
                             spend form + Meta settings form — Milestone 9
    shared/                DataTable, StageBadge, ComingSoon,
                           CsvExportButton (Milestone 9)
    search/global-search.tsx  the ⌘K command palette (Milestone 10)
    layout/notifications-bell.tsx, notifications-list.tsx  in-app
                             notification dropdown + full list view,
                             sharing the same mark-read logic
                             (Milestone 10)
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
    accounting/aging.ts       pure aging-bucket logic — split out from
                               lib/data/accounting.ts specifically so a
                               client component (the invoices DataTable's
                               status column) can compute "overdue"
                               without pulling a "server-only" module
                               into the client bundle (Milestone 8)
    settings/get-settings.ts  typed reader over the settings k/v table,
                               with SPEC §13's placeholder defaults baked
                               in so the app runs before those decisions
                               are confirmed (Milestone 4); Meta Ads
                               account id/link added in Milestone 9
    data/dashboard.ts          per-role dashboard queries — management
                               KPI row/funnel/bottleneck/top clients plus
                               sales/production/accounting/hr/staff
                               widgets (Milestone 9)
    data/analytics.ts          /analytics report queries — revenue by
                               month/client/box-style/industry, conversion
                               rate, lead-time trend, waste rate, client
                               retention (Milestone 9)
    data/ad-spend.ts            ad_spend CRUD + cost-per-lead/cost-per-
                               won-client (Milestone 9)
    integrations/meta/         Marketing API stub — TODO for Phase 2, no
                               live calls in the MVP (Milestone 9)
    csv.ts                     client-side CSV builder + download trigger,
                               no server round trip (Milestone 9)
    constants/stage-chart-colours.ts  hex equivalents of STAGE_COLOURS for
                               chart fills — same hue per stage as the
                               existing badges (Milestone 9)
    constants/roles.ts        role enum, labels, default routes
    validation/entities.ts    Zod schema per entity (drizzle-zod derived)
    notifications/create.ts    notify()/notifyMany()/notifyRoles() — the
                               one place every Server Action that needs
                               to notify someone else calls into
                               (Milestone 10)
    notifications/digest.ts    daily email digest content + send —
                               queries the plain `db` export directly,
                               not withUserContext (no signed-in user
                               drives a cron run) — Milestone 10
    data/notifications.ts      list/unread-count reads for the bell +
                               /notifications page (Milestone 10)
    data/search.ts             searchGlobal() — clients/JOs/quotations,
                               backing GET /search (Milestone 10)
scripts/
  seed-users.ts             Milestone 0 seed
  seed-data.ts               Milestone 1 seed
e2e/
  happy-path.spec.ts         Playwright: lead → quote → approve → JO →
                             produce → deliver → invoice → paid —
                             written, never run (Milestone 10; see notes)
  helpers.ts                  login/logout/advanceStage test helpers
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
- **`v_calendar_feed` is a plain SQL view queried via raw `db.execute()`**,
  not a Drizzle-modeled table — it's read-only and its shape is a UNION
  across six different tables, so there's no schema to declare. RLS on
  the *underlying* tables still applies per viewer when queried through
  the view (Postgres evaluates row-security policies using the querying
  session's claims, not the view owner's), so a production-role request
  still can't see e.g. a client's invoice-due rows they weren't allowed
  to see directly. "JO stage deadlines" (named alongside "JO target
  delivery dates" in SPEC's calendar rule) isn't a separate feed source
  — job_orders has no per-stage deadline column, only
  `target_delivery_date`, so that one source stands in for both.
- **Recurring tasks use simple presets (`daily`/`weekly`/`monthly`), not
  real RRULE parsing.** `tasks.recurrence_rule` is schema'd as free text
  for an eventual iCal RRULE string; the MVP stores one of three presets
  and advances the due date by a fixed offset when a recurring task is
  marked done, spawning the next occurrence. Good enough for "restock
  ink every Monday," not a general-purpose scheduler.
- **The calendar's layer toggles and department filter are client-side**,
  filtering an already-fetched event array rather than making a new
  request per checkbox — the feed route is only re-hit when the visible
  date range changes (FullCalendar's `datesSet`) or a new manual event
  is added.
- **`listEmployees` selects the full employee row, not a trimmed
  projection** — the edit form reuses that list for its prefill, and an
  earlier trimmed version would have silently blanked out
  sssNo/philhealthNo/pagibigNo/tin/emergencyContact on every edit (the
  form would submit them empty, overwriting real values with null).
  Caught and fixed before it ever touched real data.
- **No payroll computation** (SPEC §12 explicitly excludes it) — HR
  captures daily/monthly rate as a single input field, government IDs,
  and leave; nothing sums hours into pay.
- **Leave day counts are naive calendar-day counts** (`end − start + 1`),
  not adjusted for weekends or holidays — a placeholder pending real
  company leave policy, same class of "confirm with client" decision as
  SPEC §13's markup/threshold placeholders.
- **Leave balance entitlements default from a hardcoded table**
  (`DEFAULT_LEAVE_ENTITLEMENT_DAYS`) the first time a request against a
  given employee/year/leave-type is approved — there's no per-employee
  entitlement setup screen yet, so this is a placeholder company policy,
  not configured data.
- **Attendance CSV import** expects a `employee_no,date,time_in,time_out,
  status` header row; unknown employee numbers or duplicate employee/date
  rows are skipped and reported back in the error toast rather than
  failing the whole import.
- **Rejecting a leave request has no stored reason** —
  `leave_requests` has no `rejected_reason` column (only the generic
  `approved_by`/`approved_at`, reused for "who acted on this"). Revisit
  if HR needs an audit trail of why something was turned down.
- **Invoice generation and payment recording drive the JO state machine
  directly** — generating an invoice from a delivered JO calls the same
  `advanceJobOrderStage` used everywhere else (delivered → invoiced),
  and a payment that fully settles an invoice advances invoiced → paid.
  One transition implementation, no duplicated stage-change logic.
  `accounting` was added to `STAGE_ROLES` (Server Action) and the
  `job_orders_write` RLS policy for exactly this — `assertValidTransition`
  still gates which specific moves are legal regardless of role.
- **Job costing's "actual cost" omits logged labour hours × rate**
  (SPEC's own formula), on purpose: there's no per-operator hourly rate
  anywhere in the data model (employees have a daily/monthly rate, not
  hourly), so computing a labour line would mean fabricating an
  assumption SPEC never specifies. Actual cost = expenses tagged to the
  JO + materials issued, costed at *current* material rates (jo_materials
  doesn't snapshot cost-per-sheet at issuance) — both real, both stated
  as such in the report's own caption rather than presented as complete.
- **Withholding tax is entered manually at invoice generation** (PH EWT
  rates vary by client/transaction type and SPEC doesn't specify one) and
  is treated as settled immediately — it reduces the invoice's balance
  from creation, on the assumption the withholding certificate serves as
  proof of that portion, rather than needing an explicit "payment."
- **A real webpack build failure, caught before commit**: the first cut
  of `bucketForDueDate`/`AgingBucket` lived in the server-only
  `lib/data/accounting.ts`, and the invoices DataTable's status column
  (a Client Component) imported it — `pnpm build` correctly refused to
  bundle a `"server-only"`-guarded module into client code. Fixed by
  extracting the pure aging logic into `lib/accounting/aging.ts`, which
  has no DB dependency and is safe on both sides.

### Milestone 9 — Dashboards + Analytics

- **Single `/dashboard` route, role-conditional content — not real
  per-role URLs.** `ROLE_DEFAULT_ROUTE` (defined back in Milestone 0) is
  still unused; every role's sidebar link points at `/dashboard`, and the
  page picks the right widget set from `user.role` server-side. Simpler
  than wiring six routes + a redirect layer, and every other list page in
  this app already reads role off the session rather than the URL.
- **"Active JOs" is defined as `stage not in ('closed', 'cancelled')`** —
  a JO stays "active" through `delivered`/`invoiced`/`paid` since money or
  paperwork can still be outstanding; only an explicit close or a
  cancellation drops it off the count. This is a judgment call (SPEC
  doesn't define the KPI precisely) documented here rather than guessed
  silently.
- **"Revenue" across every analytics breakdown (by month/client/box-style/
  industry) is invoice *subtotal*, not total.** VAT is a pass-through
  liability collected on the government's behalf, not company revenue, so
  it's excluded. "Cash collected" (a separate KPI) is the actual
  `payments` total and *does* include whatever the client paid, VAT
  included — the two numbers measure different things on purpose.
- **Quotation conversion rate counts quotes *decided* in the date range**
  (`status in ('approved','rejected')`, keyed off `updated_at` since
  there's no separate `decided_at` column), not quotes *sent* in range —
  a quote sent near the end of a 90-day window and decided just after it
  closes would otherwise vanish from every range. "Source" for the
  by-source breakdown falls back from the originating lead's source to
  the client's own source when the quote wasn't lead-sourced.
- **Cost-per-lead uses the CRM's own `leads` count (`source = 'meta_ads'`),
  not `ad_spend.leads_generated`.** The latter is a number the advertiser
  types in from the platform's own reporting and may not match what
  actually landed as a real lead row — it's still stored and shown for
  reconciliation, but the KPI computation trusts the CRM, not Meta's
  self-report.
- **The company-wide Settings page (`/settings`) is still the Milestone 0
  placeholder** — no module has claimed it yet. Meta Ads needed
  *something* writable (the ad account id + Ads Manager link), so that
  one setting got its own small inline form on `/analytics/ads` instead
  of waiting on a general settings UI; it still writes through the same
  `settings` k/v table and the same `settings_admin_write` RLS policy
  (admin-only — stricter than the `AD_SPEND_ROLES` that can log spend
  entries) that a future full settings page would use.
- **Stage-keyed charts (JO funnel, bottleneck, waste-rate-by-stage) reuse
  the exact hue family from the existing `STAGE_COLOURS` badges**
  (`lib/constants/stage-chart-colours.ts`), not a freshly-generated
  categorical palette. This is a deliberate, documented departure from
  the dataviz skill's default "run the validator on a new categorical
  pick" step — SPEC §9 requires a JO stage to read as the *same* colour
  everywhere (badge, kanban, calendar, and now every chart), so the
  colour identity here is inherited from an already-shipped decision, not
  chosen fresh. Non-stage charts (revenue trend, lead-time trend, cash
  in/out) do use the dataviz skill's own validated reference palette
  (`#2a78d6` blue / `#eb6834` orange, etc.).
- **No dark mode anywhere in this app** (confirmed back in earlier
  milestones — `STAGE_COLOURS` is explicitly "light-mode only," and no
  `ThemeProvider` or toggle exists), so the new charts are light-mode
  only too. This isn't a new gap Milestone 9 introduced; the dataviz
  skill's dark-mode accessibility pass is out of scope until the app
  itself supports a dark theme.
- **`ChartCard` is the one shell every chart/table on `/dashboard` and
  `/analytics` goes through** — title, a chart/table toggle (satisfies
  the "a table view exists" accessibility rule with zero duplicated
  markup), and a CSV export button (SPEC §8's non-negotiable). Sections
  that are tables by design (revenue by client, conversion rate, waste
  rate by operator, top clients) just omit the chart child and render
  table-only.
- **Every date-range filter is a bare `<form method="get">`** — no client
  JS, no `useRouter`, the browser's own navigation re-runs the server
  component with new `searchParams`. Consistent with the rest of the app
  being server-rendered by default; a client component was only reached
  for where genuine interactivity was unavoidable (the chart/table
  toggle, the CSV button, the entry-form dialogs).
- **Job costing is not duplicated.** SPEC §8 lists "quoted cost vs actual
  cost per JO" under both Accounting (Milestone 8) and Analytics
  (Milestone 9); `/analytics` links to the existing `/accounting/job-
  costing` report instead of rebuilding the same query a second time.
- **Waste rate and lead-time trend have no dedicated Vitest coverage** —
  they're straightforward SQL aggregations (avg/sum/group-by) rather than
  business logic with edge cases worth unit-testing in isolation, unlike
  `computeQuote` or the JO state machine. Exercised only by the build/
  typecheck gate and manual review, same as the rest of this milestone's
  reporting queries — there is still no live Supabase project connected
  in this environment, so none of Milestone 9's queries have been run
  against real data; only typecheck/lint/test/build have verified them.

### Milestone 10 — Polish

- **Notifications only fire from a fixed, documented set of Server
  Action events** — not every mutation in the app. Wired in:
  lead (re-)assignment, a quotation entering `pending_approval` (notifies
  every admin/management user) and its later approve/reject (notifies
  the preparer), a JO going on hold or cancelled (notifies its sales +
  production owners), a leave request being filed (notifies
  `LEAVE_APPROVER_ROLES`) and its approve/reject (notifies the employee's
  linked user, via the new `findUserIdForEmployee` helper), and task
  (re-)assignment. Every call goes through `notify()`/`notifyMany()`/
  `notifyRoles()` (`lib/notifications/create.ts`) using the *same*
  transaction (`tx`) the triggering action is already inside — the
  notification commits with the state change or not at all. Never
  self-notifies (the actor performing the action is filtered out).
- **The email digest queries the plain `db` export, not
  `withUserContext`.** Every other read/write in this app goes through a
  signed-in user's RLS context — the digest is the one exception, because
  it runs from an external scheduler with no signed-in user to drive it.
  This mirrors the existing "trusted server-only path" carve-out
  documented on `src/lib/supabase/admin.ts` (seed scripts, the invite-user
  flow) rather than inventing a new pattern.
- **No scheduler is configured anywhere in this build.**
  `GET /api/cron/notifications-digest` is real and working, gated by a
  `CRON_SECRET` bearer token (fails closed — 503 — if that env var isn't
  set), but nothing calls it. A real deployment points an external
  scheduler (Vercel Cron, a GitHub Action on a schedule, cron-job.org,
  ...) at that URL. Digest emails also silently no-op for a user with
  nothing to report (no unread notifications and no live summary items)
  rather than sending an empty "you're all caught up" email every day.
- **Global search covers exactly what SPEC asks for — clients, JOs,
  quotations — not leads, tasks, or anything else.** `searchGlobal()`
  (`lib/data/search.ts`) runs three independent `ilike` queries through
  the normal RLS-scoped `withUserContext`, so a search never surfaces a
  row the searching user couldn't otherwise see. The command palette
  (`components/search/global-search.tsx`) is mounted once in the topbar
  — the one place in the tree that owns the ⌘K/Ctrl+K keydown listener —
  and hits a plain Route Handler (`GET /search`) rather than a Server
  Action, since it needs a debounced `fetch` from a client component, not
  a form submission.
- **Two small `data-testid` attributes were added purely for E2E
  stability** (`stage-advance-trigger` on the stepper's current-stage
  button, `advance-stage-submit` on the advance dialog's submit button)
  — the only stage-advance control in the whole JO detail page that has
  no other reliable accessible name to select by (its label is just a
  stage number/checkmark). Nothing else in the app needed one; every
  other flow in `e2e/happy-path.spec.ts` selects by role/label/text the
  same way a user would.
- **Mobile pass was a targeted audit, not a rewrite.** Most of the app
  was already mobile-safe from earlier milestones without anyone calling
  it out explicitly: both kanban boards (leads, tasks) use
  `grid-cols-1 sm:grid-cols-2 …` so they stack into a single scrollable
  column below `sm` instead of scrolling sideways; the JO stage stepper
  already had `overflow-x-auto` + `min-w-max`; the calendar's filter bar
  already used `flex-wrap`. The three genuinely cramped spots found and
  fixed were 3-column grids that packed a full label + input into ~100px
  at 375px (quotation builder's quantity tiers, the box-spec builder's
  length/width/height, the analytics retention KPI row) — each changed to
  `grid-cols-1 sm:grid-cols-3`. The pervasive `grid-cols-2` pattern used
  in nearly every Sheet/Dialog form across all ten milestones was
  deliberately left alone — two short fields side by side (date + amount,
  first name + last name) is a standard, workable mobile form pattern,
  and touching ~30 files for a marginal gain wasn't a good risk/reward
  trade for a "polish" pass.
- **The Playwright suite is written, not run — same honesty rule as
  every other milestone's untested-against-real-data disclosure, just
  more consequential here because "run the tests" is literally the
  deliverable's name.** This sandbox has no live Supabase project (true
  for the entire build, see every prior milestone's notes above) and the
  app hard-requires one for auth and every query, so there is no way to
  actually execute `pnpm test:e2e` here. `e2e/happy-path.spec.ts` was
  written by reading the real source of every screen it drives (the
  login form, lead kanban, quotation builder, JO stepper + advance
  dialog + QC checklist + deliveries panel, invoice generation, payment
  recording) so the selectors and flow should be *close*, but "close" is
  not "verified" — expect to need small selector tweaks the first time
  this actually runs against a seeded database
  (`pnpm seed:users && pnpm seed:data`, then `pnpm test:e2e`). The
  delivered→invoiced and invoiced→paid transitions are deliberately
  *not* driven through the stage stepper in the test — generating an
  invoice and recording a fully-settling payment already call
  `advanceJobOrderStage` themselves (documented back in the Milestone 8
  notes above), so the test exercises the real user-facing path instead
  of a stage-stepper shortcut that a real user wouldn't take at that
  point in the flow.
