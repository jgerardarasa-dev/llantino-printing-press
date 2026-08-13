# Llantino Ops — Build Specification (MVP)
> **How to use this file:** Save as `SPEC.md` in an empty repo. Open Claude Code in that folder and say:
> *"Read SPEC.md. Build Milestone 0 and Milestone 1 only. Stop and show me before continuing."*
> Build one milestone at a time. Do not let it build all 10 in one shot.
---
## 1. What we are building
An internal operations platform for **Llantino Printing Press**, a direct manufacturer of customized paperboard packaging boxes (food and non-food) based in the Philippines.
Today, Sales, HR, Accounting, Production, and Admin each use different apps. Updates get missed, quotations take too long because information is scattered, and management has no single view of what is happening. This system replaces that with **one login, one database, one calendar, one job order record.**
**The single most important object in this system is the Job Order.** Everything else — quotations, tasks, calendar events, costs, invoices, production stages — either produces a Job Order or hangs off one. Build the Job Order correctly and the rest follows.
### Success criteria (how we know the MVP worked)
1. A salesperson can produce a quotation for a custom box in **under 10 minutes** without asking Production for numbers.
2. Anyone in the company can open a Job Order and see, in one screen, exactly which stage it is in, who is holding it, and what happened to it so far.
3. Management can open one dashboard and see all active jobs, this week's deliveries, overdue tasks, and cash position without asking anyone.
4. Nothing important lives in a chat thread, a spreadsheet, or someone's notebook.
---
## 2. Recommended stack (use this unless told otherwise)
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router), TypeScript, strict mode** | One codebase for UI + API. Server Actions and Server Components keep it simple. |
| Database + Auth + Storage + Realtime | **Supabase** (Postgres) | Postgres with Row Level Security means permissions live in the database, not scattered in app code. Auth, file storage (artwork, PDFs, receipts), and realtime updates come free. Generous free tier, cheap to scale. |
| ORM / DB access | **Drizzle ORM** + Supabase client for auth/storage/realtime | Typed SQL, versioned migrations, no magic. |
| UI | **Tailwind CSS + shadcn/ui + lucide-react** | Fast to build, accessible, easy to restyle later. |
| Tables | **TanStack Table** | Sorting, filtering, pagination on every list view. |
| Forms | **react-hook-form + Zod** | One Zod schema per entity, shared between client validation and server validation. |
| Charts | **Recharts** | Dashboard and analytics. |
| Calendar | **FullCalendar** (React) | Month/week/day/resource views out of the box. |
| PDF generation | **@react-pdf/renderer** | Quotations, Job Order sheets, Delivery Receipts, Invoices. |
| Dates | **date-fns** + `date-fns-tz` | All display in `Asia/Manila`. |
| Email | **Resend** | Send quotations and notifications. |
| Hosting | **Vercel** (app) + **Supabase** (data) | Zero-ops. Both have free tiers adequate for the MVP. |
| Testing | **Vitest** (unit, especially pricing) + **Playwright** (one happy-path E2E) | Pricing math must have tests. It is the part that costs real money when wrong. |
### Hard technical rules
- **TypeScript strict. No `any`.** If a type is hard, model it properly.
- **All money is stored as integers in centavos** (`amount_centavos: bigint`). Never store money as float. Format for display only.
- **All timestamps stored as `timestamptz` in UTC. All display in `Asia/Manila`.** Never do date math on strings.
- **Every table has Row Level Security enabled.** No table is publicly readable.
- **Every mutation goes through a Server Action** that re-validates input with Zod and re-checks permissions server-side. Never trust the client.
- **Every write to a Job Order, Quotation, or Invoice creates an `activity_log` row.** This is non-negotiable — the audit trail is the point of the system.
- **Soft delete only** (`deleted_at`). Nothing is ever hard-deleted from the UI.
- Mobile-first responsive. Production staff and drivers will use phones on the shop floor. Every list view must be usable at 375px wide.
- Assume unreliable internet: optimistic UI where safe, clear error states, never silently lose a form submission.
---
## 3. Domain glossary (read this before writing the pricing engine)
The developer building this may not know packaging. These terms appear in the schema and UI.
- **Paperboard / Duplex board** — the stock. Common types: *Greyback duplex*, *Whiteback duplex*, *C1S (coated one side)*, *C2S*, *SBS/Ivory*, *Kraft*, *Corrugated E-flute* (for outer/mailer boxes).
- **GSM** — grams per square meter, i.e. board thickness/weight. Typical for folding cartons: **250–400 gsm**. Food boxes commonly 300–350 gsm.
- **Sheet size** — board is bought in sheets (e.g. 25"×38", 31"×43"). Cost is per sheet.
- **Ups (imposition)** — how many box blanks fit on one printing sheet. **This single number drives the whole cost.** More ups = fewer sheets = cheaper.
- **Dieline** — the flat cutting/creasing template of the box. Each unique box design needs one.
- **Die / Cutting die** — the physical steel-rule tool made from the dieline. One-time cost per new design, reused on repeat orders.
- **Plates** — offset printing plates, one per ink colour. One-time cost per job (or reusable on exact repeats). Typical: 4 plates for full colour (CMYK), plus one per spot/Pantone colour.
- **Makeready / Setup waste** — sheets destroyed while calibrating the press before good copies come out. Must be added to the sheet count.
- **Finishing** — what happens after printing: *gloss/matte lamination*, *spot UV*, *foil stamping (hot stamp)*, *embossing/debossing*, *varnish*.
- **Converting** — *die-cutting*, *stripping*, *gluing*, *folding*.
- **Repeat order** — same design as a previous job. No new plates, no new die, no new dieline. Must be dramatically cheaper and near-instant to quote.
- **JO / Job Order** — the internal work instruction issued once a client approves a quotation and issues a PO.
- **DR** — Delivery Receipt.
- **Food-grade** — food-contact boxes require food-safe inks/coatings. This is a flag on the product, not a cosmetic detail.
---
## 4. Roles and permissions
Seven roles. Store as an enum. A user has **one** primary role plus an `is_manager` boolean.
| Role | Can see | Can do |
|---|---|---|
| `admin` | Everything | Everything, including user management and settings |
| `management` | Everything | Read all, approve quotations above threshold, approve leave, cannot edit master pricing |
| `sales` | Own + team clients, all quotations, all JOs (read) | Create/edit clients, quotations, JOs; cannot see HR or payroll |
| `production` | All JOs, production calendar, materials | Advance JO stages, log output/waste, request materials; cannot see prices or client contact details |
| `accounting` | All JOs (read), invoices, payments, expenses, payroll | Issue invoices, record payments, record expenses, run payroll |
| `hr` | Employees, attendance, leave, payroll inputs | Manage employee records, leave, attendance; cannot see client or financial data |
| `staff` | Own tasks, own calendar, own attendance/leave, JOs they are assigned to | Update own tasks, file leave, log time |
**Enforce permissions in three places:** (1) Postgres RLS policies, (2) Server Action guards, (3) UI conditional rendering. If you can only do one, do RLS.
**Critical rule:** `production` role must **never** see selling price, client margin, or client contact info on the Job Order screen. Print the production copy of the JO without prices.
---
## 5. Data model
Write this as Drizzle schema + SQL migrations. Every table gets: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`, `created_by`, `deleted_at nullable`.
### Core / Org
- **`users`** — id (matches Supabase auth), full_name, email, phone, role, is_manager, department, avatar_url, is_active
- **`departments`** — name, head_user_id
- **`settings`** — singleton key/value for company info, VAT rate, default markup, quotation validity days, JO number format, approval thresholds
- **`activity_log`** — entity_type, entity_id, actor_id, action, changes (jsonb), note, created_at — **written on every meaningful mutation**
- **`notifications`** — user_id, type, title, body, link_url, read_at
- **`attachments`** — entity_type, entity_id, file_path (Supabase Storage), file_name, mime_type, size_bytes, uploaded_by, kind (`artwork` | `dieline` | `proof` | `po` | `receipt` | `photo` | `other`)
- **`comments`** — entity_type, entity_id, author_id, body, mentions (uuid[]) — threaded on JOs and quotations
### CRM
- **`clients`** — company_name, trade_name, industry, tin, address fields, city, region, is_vat_registered, payment_terms_days, credit_limit_centavos, price_tier (`standard`|`preferred`|`wholesale`), owner_user_id (account manager), source (`walk_in`|`referral`|`meta_ads`|`website`|`facebook`|`other`), status (`lead`|`prospect`|`active`|`dormant`|`lost`), notes
- **`contacts`** — client_id, name, position, email, mobile, is_primary
- **`leads`** — for pre-client inquiries: name, company, contact, source, inquiry_summary, assigned_to, stage (`new`|`contacted`|`quoted`|`won`|`lost`), lost_reason, converted_client_id
- **`interactions`** — client_id or lead_id, user_id, type (`call`|`email`|`meeting`|`site_visit`|`messenger`), summary, occurred_at, next_action, next_action_date
### Product & Pricing (the engine)
- **`materials`** — name, type (enum: duplex_greyback, duplex_whiteback, c1s, c2s, sbs, kraft, corrugated_e), gsm, sheet_width_in, sheet_length_in, cost_per_sheet_centavos, supplier, is_food_grade, is_active, min_order_sheets
- **`process_rates`** — key, label, unit (`per_sheet`|`per_piece`|`per_plate`|`per_job`|`per_sqin`), rate_centavos, setup_fee_centavos, is_active. Seed with: offset_printing, digital_printing, plate, lamination_gloss, lamination_matte, spot_uv, foil_stamp, emboss, die_cut, die_making, stripping, gluing, manual_assembly, packing
- **`box_specs`** — reusable box design: client_id (nullable for generic), name, style (`straight_tuck`|`reverse_tuck`|`auto_lock_bottom`|`snap_lock`|`mailer`|`pizza`|`sleeve`|`tray_lid`|`custom`), length_mm, width_mm, height_mm, material_id, gsm, print_colours_front, print_colours_back, has_spot_colour, spot_colour_notes, finishing (jsonb array of process keys), is_food_grade, dieline_attachment_id, ups_per_sheet, die_id, notes
- **`dies`** — box_spec reference, physical location/storage code, cost_centavos, created_date, times_used, condition
### Quotation
- **`quotations`** — quote_number (auto: `QT-2026-0001`), client_id, lead_id, prepared_by, status (`draft`|`pending_approval`|`sent`|`revised`|`approved`|`rejected`|`expired`), valid_until, currency (PHP), subtotal_centavos, vat_centavos, total_centavos, markup_pct, notes, terms, approved_by, approved_at, sent_at, rejected_reason, revision_of_quotation_id, version
- **`quotation_items`** — quotation_id, box_spec_id (nullable), description, quantity, **computed cost breakdown stored as a jsonb snapshot** (`cost_breakdown`), unit_price_centavos, line_total_centavos, lead_time_days
- **`quotation_tiers`** — quotation_item_id, quantity, unit_price_centavos — so one quote shows price at 1,000 / 3,000 / 5,000 pcs
> **Store the full cost breakdown snapshot on the quotation item.** When material prices change next month, old quotations must still show the numbers they were computed with. Never recompute historical quotes from current rates.
### Job Order — the spine
- **`job_orders`** — jo_number (`JO-2026-0001`), client_id, quotation_id, client_po_number, po_attachment_id, box_spec_id, quantity_ordered, quantity_produced, quantity_delivered, unit_price_centavos, total_centavos, **stage** (see state machine below), priority (`normal`|`rush`|`critical`), order_date, target_delivery_date, actual_delivery_date, is_repeat_order, previous_jo_id, sales_owner_id, production_owner_id, is_on_hold, hold_reason, notes
- **`jo_stage_history`** — job_order_id, from_stage, to_stage, changed_by, changed_at, duration_minutes, note — **auto-inserted by a Postgres trigger on stage change.** This powers the bottleneck analytics.
- **`jo_production_logs`** — job_order_id, stage, operator_id, machine, started_at, ended_at, good_output, waste_count, waste_reason, notes
- **`jo_materials`** — job_order_id, material_id, sheets_planned, sheets_issued, sheets_used, issued_by, issued_at
- **`jo_checklists`** — job_order_id, stage, item_label, is_done, done_by, done_at — e.g. QC checklist before packing
- **`deliveries`** — job_order_id, dr_number, scheduled_date, delivered_at, quantity, received_by_name, driver_name, vehicle, proof_photo_attachment_id, status
### Tasks & Calendar (centralised, all teams)
- **`tasks`** — title, description, department, assignee_id, watchers (uuid[]), related_entity_type, related_entity_id (links a task to a JO, quotation, client), priority, status (`todo`|`in_progress`|`blocked`|`review`|`done`|`cancelled`), due_date, completed_at, blocked_reason, checklist (jsonb), recurrence_rule (nullable RRULE string)
- **`calendar_events`** — title, description, event_type (`delivery`|`production_slot`|`meeting`|`deadline`|`leave`|`holiday`|`maintenance`|`payment_due`|`other`), department, start_at, end_at, all_day, location, attendees (uuid[]), related_entity_type, related_entity_id, colour, created_by
> **Calendar rule:** the calendar is not a separate silo. It is a **view over multiple sources**. It must render, in one unified view with toggleable layers: manual events + JO target delivery dates + JO stage deadlines + task due dates + approved leave + PH public holidays + invoice due dates. Do this with a Postgres `VIEW` (`v_calendar_feed`) that UNIONs these sources into a common shape, so nothing has to be double-entered.
### HR
- **`employees`** — user_id (nullable, not all employees log in), employee_no, full_name, position, department, employment_type (`regular`|`probationary`|`contractual`|`project`), date_hired, date_regularized, daily_rate_centavos or monthly_rate_centavos, sss_no, philhealth_no, pagibig_no, tin, emergency_contact, status
- **`attendance`** — employee_id, date, time_in, time_out, hours_worked, overtime_hours, status (`present`|`absent`|`late`|`half_day`|`leave`|`holiday`), notes
- **`leave_requests`** — employee_id, leave_type (`vacation`|`sick`|`emergency`|`maternity`|`paternity`|`unpaid`|`solo_parent`), start_date, end_date, days, reason, status (`pending`|`approved`|`rejected`|`cancelled`), approved_by, approved_at
- **`leave_balances`** — employee_id, year, leave_type, entitled_days, used_days
- **`holidays`** — date, name, type (`regular`|`special_non_working`) — seed with PH holidays
### Accounting
- **`invoices`** — invoice_number, job_order_id, client_id, invoice_date, due_date, subtotal_centavos, vat_centavos, withholding_tax_centavos, total_centavos, amount_paid_centavos, balance_centavos, status (`draft`|`issued`|`partially_paid`|`paid`|`overdue`|`cancelled`), notes
- **`payments`** — invoice_id, client_id, amount_centavos, payment_date, method (`cash`|`bank_transfer`|`check`|`gcash`|`maya`|`other`), reference_no, check_date, received_by, attachment_id
- **`expenses`** — category (`materials`|`utilities`|`salaries`|`rent`|`maintenance`|`transport`|`marketing`|`supplies`|`other`), vendor, description, amount_centavos, expense_date, job_order_id (nullable — for job costing), payment_method, receipt_attachment_id, recorded_by
- **`purchase_orders`** — supplier, po_number, items (jsonb), total_centavos, status, expected_date, received_date, job_order_id (nullable)
---
## 6. Job Order state machine
This is the heart of the product. Implement as a Postgres enum + an explicit transition map in TypeScript. **Illegal transitions must throw.**

```
draft
  → for_artwork        (JO created from approved quotation + client PO)
  → artwork_approval   (layout submitted to client for proofing)
  → prepress           (client approved; plates + dieline/die prepared)
  → materials_ready    (board issued from stock or received from supplier)
  → printing
  → finishing          (lamination / spot UV / foil / emboss)
  → die_cutting
  → gluing_assembly
  → quality_check
  → packing
  → ready_for_delivery
  → delivered
  → invoiced
  → paid
  → closed
```

Plus two orthogonal flags reachable from any stage: `on_hold` (with `hold_reason`) and `cancelled` (terminal, requires reason + manager approval).
### Rules
- Any stage may move **backward one step** (rework) but this requires a mandatory `note` and is flagged red in history.
- `artwork_approval → prepress` requires an attachment of kind `proof` and a recorded client approval (name + date).
- `quality_check → packing` requires all `jo_checklists` rows for that JO to be `is_done`.
- `delivered → invoiced` requires a `deliveries` row with a `delivered_at` value.
- Moving into any stage sets `production_owner_id` to the acting user unless one is already assigned.
- Every transition writes `jo_stage_history` **via a database trigger**, not application code, so it can never be bypassed.
- A JO whose `target_delivery_date` is within 3 days and is not yet at `ready_for_delivery` is surfaced as **at risk** on the dashboard.
### Job Order detail screen layout
One page, no tab-hunting for the important stuff:
1. **Header:** JO number, client, product name, quantity, target date, big coloured stage badge, priority flag.
2. **Stage pipeline:** horizontal stepper showing all stages, completed ones green with the date and who did it, current one pulsing, future ones grey. Clicking the current stage opens the "advance stage" dialog.
3. **Three-column body:** Specs (box spec, material, colours, finishing, dieline preview) | Progress (production logs, output vs waste, materials issued) | Commercial (price, PO, invoice status — **hidden from `production` role**).
4. **Right rail:** attachments, assigned people, related tasks, comments with @mentions.
5. **Bottom:** full activity timeline, newest first.
---
## 7. Quotation engine
This is where the "quotation takes too long" problem gets solved. Build it as a **pure, tested function** in `lib/pricing/`, called by a Server Action. Never inline this math in a component.

```ts
computeQuote(input: QuoteInput): QuoteBreakdown
```

### Algorithm

```
1. SHEETS
   ups            = box_spec.ups_per_sheet   (manual entry in MVP; see note)
   net_sheets     = ceil(quantity / ups)
   spoilage_pct   = setting (default 5%, configurable per process)
   makeready      = process_rates.offset_printing.setup_sheets (default 150 sheets, or 50 for digital)
   total_sheets   = ceil(net_sheets * (1 + spoilage_pct)) + makeready
2. MATERIAL
   material_cost  = total_sheets * material.cost_per_sheet_centavos
3. PLATES (offset only; skip on repeat orders where plates exist)
   plate_count    = colours_front + colours_back + spot_colours
   plate_cost     = plate_count * process_rates.plate.rate
4. PRINTING
   impressions    = total_sheets * (1 if single-sided else 2)
   printing_cost  = impressions * offset_printing.rate + offset_printing.setup_fee
5. FINISHING  (for each selected finishing process)
   per_sheet processes  → total_sheets * rate + setup_fee
   per_piece processes  → quantity * rate + setup_fee
6. DIE
   if new design      → die_making.rate (one-time) ; else 0
   die_cutting_cost   = total_sheets * die_cut.rate + die_cut.setup_fee
7. CONVERTING
   gluing_cost        = quantity * gluing.rate
   packing_cost       = quantity * packing.rate
8. TOTALS
   direct_cost   = sum(2..7)
   overhead      = direct_cost * overhead_pct (setting, default 12%)
   total_cost    = direct_cost + overhead
   markup        = client.price_tier → markup_pct (standard 35%, preferred 28%, wholesale 20%) — overridable per quote
   selling_price = total_cost * (1 + markup_pct)
   unit_price    = selling_price / quantity        // round UP to nearest ₱0.05
   vat           = selling_price * 0.12 (if client.is_vat_registered or company is VAT-registered)
   grand_total   = selling_price + vat
```

### Requirements
- **Show the full breakdown to sales**, line by line, with each cost component and its percentage of total. Sales must be able to see *why* a box costs ₱14.20 and defend it to a client.
- **Quantity tiers:** compute the same quote at 3 quantities simultaneously (e.g. 1,000 / 3,000 / 5,000) and render as a comparison table. One-time costs (plates, die) amortise over quantity — this is the main reason bigger runs are cheaper, and the client should see it.
- **Manual override:** any computed line may be overridden with a reason; the override is stored and shown in the breakdown.
- **Repeat order path:** if `is_repeat_order`, pre-fill everything from the previous JO, zero out plate and die-making costs, and let sales issue a quotation in **under 60 seconds**.
- **Approval threshold:** if `markup_pct` falls below the configured floor (default 20%) or total exceeds a configured amount, the quotation enters `pending_approval` and cannot be sent until a `management` user approves.
- **PDF output:** branded quotation PDF with company header, client details, itemised table, quantity tiers, lead time, terms, validity date, prepared-by signature block. Emailable via Resend, and downloadable.
- **Unit tests are mandatory** for `computeQuote`. Cover: standard 4-colour box, repeat order, digital short-run, spot-UV + foil combo, tier amortisation, VAT on/off, rounding. Pricing bugs cost real money.
> **Ups calculation note:** true imposition from box dimensions + dieline nesting is out of scope for the MVP. Enter `ups_per_sheet` manually on the box spec, but show a rough helper calculation (flat blank width/height derived from box style formula vs sheet size, minus 10mm gripper margin) as a *suggestion* the estimator can accept or override.
---
## 8. Dashboards
### Management dashboard (default landing page for `management` / `admin`)
- KPI row: Active JOs · Due this week · Overdue · Quotations pending approval · Quotation win rate (30d) · Revenue MTD · Receivables outstanding · Cash collected MTD
- **JO pipeline funnel**: count and peso value at each stage
- **At-risk jobs table**: JOs whose target date is near and stage is behind — sorted by urgency, red
- **Bottleneck chart**: average hours spent per stage over the last 90 days, derived from `jo_stage_history`. This answers "where do we actually lose time?"
- Deliveries scheduled this week
- Aging receivables (0–30 / 31–60 / 61–90 / 90+)
- Top 10 clients by revenue (period selectable)
### Role dashboards
- **Sales:** my leads by stage, quotations awaiting client response, quotations expiring in 7 days, my clients with no interaction in 30 days, my won/lost this month, my JOs in progress
- **Production:** today's production queue ordered by priority then target date, JOs at my stage, materials shortages, waste rate this week, output vs plan
- **Accounting:** unbilled delivered JOs (money on the table), overdue invoices, payments received this week, expenses this month, cash in/out chart
- **HR:** headcount, who's on leave today, pending leave requests, attendance exceptions this week, upcoming regularization dates
- **Staff:** my tasks, my calendar, my attendance, my leave balance
### Analytics section (`/analytics`)
- Revenue by month, by client, by box style, by industry
- **Job costing**: quoted cost vs actual cost per JO (actual = `expenses` tagged to the JO + materials issued at cost + logged labour hours × rate). Show variance %. This is the single most valuable report in the system.
- Quotation conversion rate by salesperson and by lead source
- Average lead time from JO creation to delivery, trended
- Waste rate by stage and by operator
- Client retention / repeat order rate
- Every chart has a date-range filter and a CSV export button
### Meta Ads
For the MVP, do **not** integrate the Marketing API. Build `/analytics/ads` as:
- A settings-configurable link that opens Meta Ads Manager in a new tab
- An embedded panel with instructions and the ad account ID from settings
- **A manual monthly entry form** (`ad_spend` table: month, platform, campaign_name, spend_centavos, leads_generated, notes) so the system can still compute **cost per lead** and **cost per won client** by joining against `leads.source = 'meta_ads'` and their resulting job orders. This gives real marketing ROI without any API work.
- Leave a clearly marked `lib/integrations/meta/` stub with a TODO for Phase 2 live API integration.
---
## 9. Design direction
Not a generic admin template. This is a manufacturing floor tool that management also reads.
- **Density over whitespace.** Operators need to see 20 job orders at once, not 6. Compact table rows, 13–14px base in data views.
- **Colour carries meaning, not decoration.** Fixed semantic palette: stage colours consistent everywhere (a JO in `printing` is the same colour on the dashboard, the calendar, and the list). Red = overdue/at-risk only. Never use red decoratively.
- **Typography:** one clean sans (Inter or Geist) for UI; **tabular numerals** (`font-variant-numeric: tabular-nums`) on every money and quantity column so digits align.
- **Peso formatting:** `₱1,234.56` everywhere, right-aligned, no exceptions.
- Neutral base (warm greys/near-white), one confident brand accent pulled from the Llantino identity, and the stage palette. Dark mode is not required for the MVP.
- Skeleton loaders, never spinners, on data views. Empty states explain what to do next, with the action button in them.
- Every destructive action needs confirmation. Every long action shows progress.
---
## 10. Build order
Build and stop at each milestone. Do not proceed until told.
| # | Milestone | Deliverable |
|---|---|---|
| **0** | **Foundation** | Next.js + TS + Tailwind + shadcn scaffold. Supabase project, Drizzle config, migrations pipeline. Auth (email + password, invite-only). App shell: sidebar, topbar, role-aware nav, breadcrumb, toast system. Seed script with 8 demo users covering all roles. |
| **1** | **Data layer** | Full schema, all migrations, all RLS policies, Zod schemas per entity, `activity_log` trigger, seed data: 15 clients, 12 materials, 20 process rates, 10 box specs, PH holidays, 25 job orders spread across all stages. |
| **2** | **CRM** | Clients list + detail, contacts, leads pipeline (kanban), interactions log, client 360 view (all quotes/JOs/invoices for a client on one page). |
| **3** | **Pricing engine** | `computeQuote` + full Vitest suite. Materials and process rates admin CRUD. Box spec builder. |
| **4** | **Quotations** | Quotation builder UI with live breakdown panel, quantity tiers, approval workflow, PDF export, email send, revisions/versioning. |
| **5** | **Job Orders** | JO creation from approved quotation, state machine + trigger, JO detail page, stage advance dialogs, production logs, materials issuance, QC checklist, deliveries + DR PDF. |
| **6** | **Tasks + Calendar** | Task board (kanban + list + my-tasks), recurring tasks, `v_calendar_feed` view, unified FullCalendar with layer toggles, per-department filtering. |
| **7** | **HR** | Employees, attendance entry + import, leave requests + approval flow, leave balances, holiday calendar integration. |
| **8** | **Accounting** | Invoice generation from delivered JOs, payments, aging, expenses with JO tagging, job costing report. |
| **9** | **Dashboards + Analytics** | All role dashboards, analytics pages, CSV exports, Meta Ads page with manual spend entry and cost-per-lead. |
| **10** | **Polish** | Notifications (in-app + email digest), global search (⌘K across clients/JOs/quotes), mobile pass on all list views, Playwright happy path: lead → quote → approve → JO → produce → deliver → invoice → paid. |
---
## 11. Non-negotiables checklist
Before declaring any milestone done, verify:
- [ ] RLS enabled and tested on every new table (test by querying as each role)
- [ ] All money is integer centavos; no float arithmetic anywhere
- [ ] All new mutations write `activity_log`
- [ ] Server-side Zod validation on every Server Action, not just client-side
- [ ] `production` role cannot see any selling price or client contact field
- [ ] Every list view works at 375px width
- [ ] Every list view has search, filter, sort, and pagination
- [ ] Dates displayed in `Asia/Manila`, stored UTC
- [ ] Empty states and error states exist for every view
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass
---
## 12. Explicitly out of scope for the MVP
Note these as TODOs, do not build them:
- Live Meta Marketing API integration (manual entry instead — Phase 2)
- Automatic imposition / ups calculation from dieline geometry
- Client-facing portal (clients tracking their own orders)
- Machine/IoT integration or barcode scanning on the shop floor
- Full BIR-compliant accounting or official receipt series
- Payroll computation and government contribution tables (HR captures inputs only)
- Multi-currency
- Native mobile app (responsive web only)
- Inventory management beyond board sheets issued against a JO
- SMS / Viber notifications
---
## 13. Open decisions to confirm with the client
Flag these; do not guess silently:
1. **JO numbering format** — `JO-2026-0001` sequential, or with a client/product prefix?
2. **VAT registration status** of Llantino, and whether prices are quoted VAT-inclusive or exclusive by default.
3. **Default markup percentages** per client tier — the values in §7 are placeholders.
4. **Actual machine list and process rates** — the pricing engine is only as good as the seeded rates.
5. **Approval threshold** amount above which management must approve a quotation.
6. **Standard sheet sizes and current board prices** from their supplier.
7. **Headcount** — determines Supabase/Vercel tier and whether attendance needs a biometric import path.
