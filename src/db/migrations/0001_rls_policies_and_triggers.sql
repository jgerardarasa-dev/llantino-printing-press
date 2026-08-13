-- =========================================================================
-- Llantino Ops — RLS policies, role helper functions, and activity_log
-- trigger. Written by hand (not drizzle-kit generated) because RLS
-- policies, Postgres functions, and triggers live outside Drizzle's
-- schema diffing. Run this against a real Supabase project — it assumes
-- the `auth` schema and `auth.uid()` that Supabase provisions.
--
-- IMPORTANT — how RLS applies to Drizzle queries:
-- Supabase's own client (PostgREST) authenticates each request as the
-- `authenticated` Postgres role and sets `request.jwt.claims` from the
-- user's JWT, which is what `auth.uid()` reads. Server Actions that use
-- Drizzle (a direct Postgres connection, not PostgREST) must reproduce
-- that context per transaction or RLS silently no-ops. Use
-- `withUserContext()` from src/db/client.ts for every Drizzle mutation
-- that should be subject to RLS, and never point DATABASE_URL at a
-- BYPASSRLS role from the app runtime (the service role / admin client
-- is for trusted server-only paths like the invite-user flow and seed
-- scripts only).
--
-- KNOWN LIMITATION — column-level hiding: Postgres RLS restricts ROWS,
-- not columns. The rule "production must never see selling price or
-- client contact info" cannot be expressed as an RLS policy on
-- job_orders/clients directly. It is enforced by (a) Server Actions and
-- data-fetching functions for the production role always selecting a
-- price-free column set, and (b) the JO detail UI never rendering
-- commercial data when the viewer's role is `production`. See
-- SPEC.md §4 and §6. A stricter version (separate DB roles per app role
-- with column-level GRANTs) is a possible hardening for a later phase.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Link public.users to Supabase's auth.users
-- -------------------------------------------------------------------------
alter table "public"."users"
  add constraint "users_id_fkey" foreign key ("id") references "auth"."users"("id") on delete cascade;

-- -------------------------------------------------------------------------
-- 2. Role helper functions (SECURITY DEFINER so they can read public.users
--    without recursing into that table's own RLS policy)
-- -------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and deleted_at is null;
$$;

create or replace function public.current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_manager from public.users where id = auth.uid() and deleted_at is null), false);
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.users where id = auth.uid() and deleted_at is null), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.current_user_role() = 'admin' $$;

create or replace function public.is_admin_or_management()
returns boolean language sql stable as $$ select public.current_user_role() in ('admin', 'management') $$;

create or replace function public.is_sales()
returns boolean language sql stable as $$ select public.current_user_role() = 'sales' $$;

create or replace function public.is_production()
returns boolean language sql stable as $$ select public.current_user_role() = 'production' $$;

create or replace function public.is_accounting()
returns boolean language sql stable as $$ select public.current_user_role() = 'accounting' $$;

create or replace function public.is_hr()
returns boolean language sql stable as $$ select public.current_user_role() = 'hr' $$;

create or replace function public.is_staff()
returns boolean language sql stable as $$ select public.current_user_role() = 'staff' $$;

-- Commercial/back-office roles that plan, sell, and account for jobs.
create or replace function public.is_commercial_role()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'management', 'sales', 'accounting')
$$;

-- CRM owners: SPEC §4 gives clients/leads/CRM write access to sales
-- (plus admin/management), not accounting — accounting can still *read*
-- clients via is_commercial_role() (it needs to know who it's invoicing).
create or replace function public.is_crm_owner_role()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'management', 'sales')
$$;

-- HR/financial roles allowed to see payroll-adjacent data.
create or replace function public.is_hr_or_finance_role()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'management', 'hr', 'accounting')
$$;

-- =========================================================================
-- 3. Row Level Security — every table, per SPEC §4 role matrix.
-- =========================================================================

-- ---- users ---------------------------------------------------------------
alter table "users" enable row level security;

create policy "users_select_active_directory" on "users"
  for select to authenticated
  using (deleted_at is null);

create policy "users_admin_write" on "users"
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- departments -----------------------------------------------------------
alter table "departments" enable row level security;

create policy "departments_select_all" on "departments"
  for select to authenticated using (true);

create policy "departments_admin_management_write" on "departments"
  for all to authenticated
  using (public.is_admin_or_management())
  with check (public.is_admin_or_management());

-- ---- settings --------------------------------------------------------------
alter table "settings" enable row level security;

create policy "settings_select_all" on "settings"
  for select to authenticated using (true);

create policy "settings_admin_write" on "settings"
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- activity_log ----------------------------------------------------------
-- Append-only audit trail. Every authenticated user may insert a row
-- attributed to themselves (Server Actions do this on every JO/quotation/
-- invoice mutation); nothing may ever be updated or deleted.
alter table "activity_log" enable row level security;

create policy "activity_log_select" on "activity_log"
  for select to authenticated
  using (
    public.is_admin_or_management()
    or actor_id = auth.uid()
    -- entity_type values match Postgres's tg_table_name (the real,
    -- plural table name) since that's what the activity_log trigger
    -- (see log_activity() below) actually inserts — keep any future
    -- explicit inserts consistent with that, not the singular form.
    or (public.is_sales() and entity_type in ('clients', 'contacts', 'leads', 'interactions', 'quotations', 'job_orders'))
    or (public.is_production() and entity_type in ('job_orders'))
    or (public.is_accounting() and entity_type in ('invoices', 'payments', 'expenses', 'purchase_orders', 'job_orders', 'quotations'))
    or (public.is_hr() and entity_type in ('employees', 'attendance', 'leave_requests', 'leave_balances'))
    or (public.is_staff() and entity_type in ('tasks'))
  );

create policy "activity_log_insert" on "activity_log"
  for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

-- ---- notifications -----------------------------------------------------------
alter table "notifications" enable row level security;

create policy "notifications_select_own" on "notifications"
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own" on "notifications"
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_insert" on "notifications"
  for insert to authenticated with check (true);

-- ---- attachments -------------------------------------------------------------
alter table "attachments" enable row level security;

create policy "attachments_select_all" on "attachments"
  for select to authenticated using (true);

create policy "attachments_insert" on "attachments"
  for insert to authenticated with check (uploaded_by = auth.uid() or uploaded_by is null);

create policy "attachments_modify_own_or_admin" on "attachments"
  for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin_or_management())
  with check (uploaded_by = auth.uid() or public.is_admin_or_management());

create policy "attachments_delete_admin" on "attachments"
  for delete to authenticated using (public.is_admin_or_management());

-- ---- comments ------------------------------------------------------------
alter table "comments" enable row level security;

create policy "comments_select_all" on "comments"
  for select to authenticated using (true);

create policy "comments_insert_own" on "comments"
  for insert to authenticated with check (author_id = auth.uid());

create policy "comments_update_own" on "comments"
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin_or_management())
  with check (author_id = auth.uid() or public.is_admin_or_management());

-- ---- CRM: clients, contacts, leads, interactions ---------------------------
-- Sales, admin, and management run CRM. Production/HR/staff get no access
-- (production must not see client contact info; HR/staff have no
-- business reason to).
alter table "clients" enable row level security;
alter table "contacts" enable row level security;
alter table "leads" enable row level security;
alter table "interactions" enable row level security;

create policy "clients_select_commercial" on "clients"
  for select to authenticated using (public.is_commercial_role());

create policy "clients_write_crm_owner" on "clients"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

create policy "contacts_select_commercial" on "contacts"
  for select to authenticated using (public.is_commercial_role());

create policy "contacts_write_crm_owner" on "contacts"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

create policy "leads_select_commercial" on "leads"
  for select to authenticated using (public.is_commercial_role());

create policy "leads_write_crm_owner" on "leads"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

create policy "interactions_select_commercial" on "interactions"
  for select to authenticated using (public.is_commercial_role());

create policy "interactions_write_crm_owner" on "interactions"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

-- ---- Product & pricing: materials, process_rates, box_specs, dies ---------
-- Sales/production/accounting need read access to price and estimate
-- jobs / plan the floor; only admin/management may edit master pricing
-- (SPEC §4: "management ... cannot edit master pricing").
alter table "materials" enable row level security;
alter table "process_rates" enable row level security;
alter table "box_specs" enable row level security;
alter table "dies" enable row level security;

create policy "materials_select_all" on "materials"
  for select to authenticated using (true);

create policy "materials_admin_write" on "materials"
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "process_rates_select_all" on "process_rates"
  for select to authenticated using (true);

create policy "process_rates_admin_write" on "process_rates"
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "box_specs_select_all" on "box_specs"
  for select to authenticated using (true);

create policy "box_specs_write" on "box_specs"
  for all to authenticated
  using (public.is_commercial_role() or public.is_production())
  with check (public.is_commercial_role() or public.is_production());

create policy "dies_select_all" on "dies"
  for select to authenticated using (true);

create policy "dies_write" on "dies"
  for all to authenticated
  using (public.is_commercial_role() or public.is_production())
  with check (public.is_commercial_role() or public.is_production());

-- ---- Quotations ------------------------------------------------------------
-- All commercial roles read; sales/admin/management write; approval
-- fields are meant to be set only by management/admin (enforced again in
-- the Server Action layer since RLS can't restrict individual columns).
alter table "quotations" enable row level security;
alter table "quotation_items" enable row level security;
alter table "quotation_tiers" enable row level security;

-- Write access (including approve/reject, which only touch
-- status/approved_by/approved_at — RLS can't restrict individual
-- columns, so admin/management get the same row-level write access as
-- sales here) is CRM-owner only; accounting keeps read-only, matching
-- the same correction made for clients/contacts/leads/interactions.
create policy "quotations_select_commercial" on "quotations"
  for select to authenticated using (public.is_commercial_role());

create policy "quotations_write_crm_owner" on "quotations"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

create policy "quotation_items_select_commercial" on "quotation_items"
  for select to authenticated using (public.is_commercial_role());

create policy "quotation_items_write_crm_owner" on "quotation_items"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

create policy "quotation_tiers_select_commercial" on "quotation_tiers"
  for select to authenticated using (public.is_commercial_role());

create policy "quotation_tiers_write_crm_owner" on "quotation_tiers"
  for all to authenticated
  using (public.is_crm_owner_role())
  with check (public.is_crm_owner_role());

-- ---- Job Order spine ---------------------------------------------------------
-- job_orders themselves: everyone except HR/staff-without-assignment can
-- read (production needs full visibility of the floor per §4; staff only
-- sees JOs they're assigned to as sales/production owner).
alter table "job_orders" enable row level security;
alter table "jo_stage_history" enable row level security;
alter table "jo_production_logs" enable row level security;
alter table "jo_materials" enable row level security;
alter table "jo_checklists" enable row level security;
alter table "deliveries" enable row level security;

create policy "job_orders_select" on "job_orders"
  for select to authenticated
  using (
    public.is_admin_or_management()
    or public.is_sales()
    or public.is_production()
    or public.is_accounting()
    or (public.is_staff() and auth.uid() in (sales_owner_id, production_owner_id))
  );

create policy "job_orders_write" on "job_orders"
  for all to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production())
  with check (public.is_admin_or_management() or public.is_sales() or public.is_production());

create policy "jo_stage_history_select" on "jo_stage_history"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production() or public.is_accounting());

-- jo_stage_history is written exclusively by the stage-change trigger
-- (M5), never directly by application code — no insert/update/delete
-- policy is granted here on purpose.

create policy "jo_production_logs_select" on "jo_production_logs"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production() or public.is_accounting());

create policy "jo_production_logs_write" on "jo_production_logs"
  for all to authenticated
  using (public.is_admin_or_management() or public.is_production())
  with check (public.is_admin_or_management() or public.is_production());

create policy "jo_materials_select" on "jo_materials"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production() or public.is_accounting());

create policy "jo_materials_write" on "jo_materials"
  for all to authenticated
  using (public.is_admin_or_management() or public.is_production())
  with check (public.is_admin_or_management() or public.is_production());

create policy "jo_checklists_select" on "jo_checklists"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production() or public.is_accounting());

create policy "jo_checklists_write" on "jo_checklists"
  for all to authenticated
  using (public.is_admin_or_management() or public.is_production())
  with check (public.is_admin_or_management() or public.is_production());

create policy "deliveries_select" on "deliveries"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_sales() or public.is_production() or public.is_accounting());

create policy "deliveries_write" on "deliveries"
  for all to authenticated
  using (public.is_admin_or_management() or public.is_production() or public.is_sales())
  with check (public.is_admin_or_management() or public.is_production() or public.is_sales());

-- ---- Tasks & calendar ----------------------------------------------------
-- Company-wide visibility (this is the whole point of a shared calendar),
-- but only the assignee/creator/manager may edit a task.
alter table "tasks" enable row level security;
alter table "calendar_events" enable row level security;

create policy "tasks_select_all" on "tasks"
  for select to authenticated using (true);

create policy "tasks_insert" on "tasks"
  for insert to authenticated with check (true);

create policy "tasks_update" on "tasks"
  for update to authenticated
  using (
    assignee_id = auth.uid()
    or created_by = auth.uid()
    or auth.uid() = any (watchers)
    or public.is_admin_or_management()
  )
  with check (true);

create policy "tasks_delete" on "tasks"
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin_or_management());

create policy "calendar_events_select_all" on "calendar_events"
  for select to authenticated using (true);

create policy "calendar_events_write" on "calendar_events"
  for all to authenticated
  using (created_by = auth.uid() or public.is_admin_or_management())
  with check (true);

-- ---- HR: employees, attendance, leave, holidays ---------------------------
-- Off-limits to sales/production per §4 ("cannot see client or financial
-- data" is HR's own restriction; the mirror rule is sales/production
-- cannot see HR/payroll).
alter table "employees" enable row level security;
alter table "attendance" enable row level security;
alter table "leave_requests" enable row level security;
alter table "leave_balances" enable row level security;
alter table "holidays" enable row level security;

create policy "employees_select" on "employees"
  for select to authenticated
  using (public.is_hr_or_finance_role() or user_id = auth.uid());

create policy "employees_write_hr" on "employees"
  for all to authenticated
  using (public.is_admin() or public.is_hr())
  with check (public.is_admin() or public.is_hr());

create policy "attendance_select" on "attendance"
  for select to authenticated
  using (
    public.is_hr_or_finance_role()
    or employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "attendance_write_hr" on "attendance"
  for all to authenticated
  using (public.is_admin() or public.is_hr())
  with check (public.is_admin() or public.is_hr());

create policy "leave_requests_select" on "leave_requests"
  for select to authenticated
  using (
    public.is_hr_or_finance_role()
    or employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "leave_requests_insert_own" on "leave_requests"
  for insert to authenticated
  with check (
    public.is_admin() or public.is_hr()
    or employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "leave_requests_update" on "leave_requests"
  for update to authenticated
  using (
    public.is_admin() or public.is_hr() or public.is_admin_or_management()
    or employee_id in (select id from employees where user_id = auth.uid())
  )
  with check (true);

create policy "leave_balances_select" on "leave_balances"
  for select to authenticated
  using (
    public.is_hr_or_finance_role()
    or employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "leave_balances_write_hr" on "leave_balances"
  for all to authenticated
  using (public.is_admin() or public.is_hr())
  with check (public.is_admin() or public.is_hr());

create policy "holidays_select_all" on "holidays"
  for select to authenticated using (true);

create policy "holidays_write_hr" on "holidays"
  for all to authenticated
  using (public.is_admin() or public.is_hr())
  with check (public.is_admin() or public.is_hr());

-- ---- Accounting: invoices, payments, expenses, purchase_orders -----------
alter table "invoices" enable row level security;
alter table "payments" enable row level security;
alter table "expenses" enable row level security;
alter table "purchase_orders" enable row level security;

create policy "invoices_select" on "invoices"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_accounting() or public.is_sales());

create policy "invoices_write_accounting" on "invoices"
  for all to authenticated
  using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());

create policy "payments_select" on "payments"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_accounting() or public.is_sales());

create policy "payments_write_accounting" on "payments"
  for all to authenticated
  using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());

create policy "expenses_select" on "expenses"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_accounting());

create policy "expenses_write_accounting" on "expenses"
  for all to authenticated
  using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());

create policy "purchase_orders_select" on "purchase_orders"
  for select to authenticated
  using (public.is_admin_or_management() or public.is_accounting() or public.is_production());

create policy "purchase_orders_write_accounting" on "purchase_orders"
  for all to authenticated
  using (public.is_admin() or public.is_accounting())
  with check (public.is_admin() or public.is_accounting());

-- ---- Marketing: ad_spend --------------------------------------------------
alter table "ad_spend" enable row level security;

create policy "ad_spend_select_commercial" on "ad_spend"
  for select to authenticated using (public.is_commercial_role());

create policy "ad_spend_write_admin_management" on "ad_spend"
  for all to authenticated
  using (public.is_admin_or_management())
  with check (public.is_admin_or_management());

-- =========================================================================
-- 4. activity_log trigger — written on every meaningful mutation to
--    job_orders, quotations, and invoices (non-negotiable per SPEC).
-- =========================================================================
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
  v_action text;
  v_changes jsonb;
begin
  if (tg_op = 'INSERT') then
    v_entity_id := new.id;
    v_action := 'created';
    v_changes := to_jsonb(new);
  elsif (tg_op = 'UPDATE') then
    v_entity_id := new.id;
    v_action := 'updated';
    select jsonb_object_agg(key, jsonb_build_object('from', old_val, 'to', new_val))
      into v_changes
      from (
        select key, old_json.value as old_val, new_json.value as new_val
        from jsonb_each(to_jsonb(old)) as old_json(key, value)
        join jsonb_each(to_jsonb(new)) as new_json(key, value) using (key)
        where old_json.value is distinct from new_json.value
          and key not in ('updated_at')
      ) diffed;
    if v_changes is null or v_changes = '{}'::jsonb then
      return new; -- no meaningful change (e.g. only updated_at touched)
    end if;
  elsif (tg_op = 'DELETE') then
    v_entity_id := old.id;
    v_action := case when old.deleted_at is null and new is null then 'deleted' else 'deleted' end;
    v_changes := to_jsonb(old);
  end if;

  insert into public.activity_log (entity_type, entity_id, actor_id, action, changes)
  values (tg_table_name, v_entity_id, auth.uid(), v_action, v_changes);

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

create trigger job_orders_activity_log
  after insert or update on "job_orders"
  for each row execute function public.log_activity();

create trigger quotations_activity_log
  after insert or update on "quotations"
  for each row execute function public.log_activity();

create trigger invoices_activity_log
  after insert or update on "invoices"
  for each row execute function public.log_activity();
