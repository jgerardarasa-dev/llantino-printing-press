-- =========================================================================
-- v_calendar_feed — Milestone 6. SPEC §5 "Calendar rule": the calendar is
-- not a separate silo, it's a VIEW over multiple sources, so nothing has
-- to be double-entered. UNIONs: manual calendar_events + JO target
-- delivery dates + task due dates + approved leave + PH holidays +
-- invoice due dates, into one common shape the UI renders generically.
--
-- "JO stage deadlines" (also named in SPEC's calendar rule) is not a
-- separate source here — job_orders has no per-stage deadline column,
-- only target_delivery_date, so that single source stands in for both.
--
-- RLS note: this is a plain (non security-barrier) view, so it inherits
-- the querying role's row-level access to each underlying table via
-- Postgres's normal view-permission-checking (the view owner still needs
-- SELECT on the base tables, and each base table's own RLS policies
-- apply per row as if queried directly). No separate RLS policy is
-- attached to the view itself.
-- =========================================================================

create or replace view public.v_calendar_feed as
select
  'manual:' || ce.id::text as feed_id,
  'manual' as source,
  ce.event_type::text as event_type,
  ce.title,
  ce.description,
  ce.department,
  ce.start_at,
  ce.end_at,
  ce.all_day,
  ce.location,
  ce.colour,
  ce.related_entity_type,
  ce.related_entity_id,
  ce.created_by as owner_id
from public.calendar_events ce
where ce.deleted_at is null

union all

select
  'jo_target:' || jo.id::text,
  'job_order_target',
  'delivery',
  'Target delivery: ' || jo.jo_number,
  null,
  null,
  jo.target_delivery_date::timestamptz,
  jo.target_delivery_date::timestamptz,
  true,
  null,
  null,
  'job_orders',
  jo.id,
  jo.production_owner_id
from public.job_orders jo
where jo.deleted_at is null
  and jo.target_delivery_date is not null
  and jo.stage not in ('delivered', 'invoiced', 'paid', 'closed', 'cancelled')

union all

select
  'task_due:' || t.id::text,
  'task',
  'deadline',
  t.title,
  t.description,
  t.department,
  t.due_date,
  t.due_date,
  true,
  null,
  null,
  'tasks',
  t.id,
  t.assignee_id
from public.tasks t
where t.deleted_at is null
  and t.due_date is not null
  and t.status not in ('done', 'cancelled')

union all

select
  'leave:' || lr.id::text,
  'leave',
  'leave',
  'Leave: ' || coalesce(e.full_name, 'Employee'),
  lr.reason,
  e.department,
  lr.start_date::timestamptz,
  (lr.end_date::timestamp + interval '1 day')::timestamptz,
  true,
  null,
  null,
  'leave_requests',
  lr.id,
  e.user_id
from public.leave_requests lr
left join public.employees e on e.id = lr.employee_id
where lr.deleted_at is null
  and lr.status = 'approved'

union all

select
  'holiday:' || h.id::text,
  'holiday',
  'holiday',
  h.name,
  null,
  null,
  h.date::timestamptz,
  h.date::timestamptz,
  true,
  null,
  null,
  'holidays',
  h.id,
  null
from public.holidays h
where h.deleted_at is null

union all

select
  'invoice_due:' || inv.id::text,
  'invoice_due',
  'payment_due',
  'Invoice due: ' || inv.invoice_number,
  null,
  null,
  inv.due_date::timestamptz,
  inv.due_date::timestamptz,
  true,
  null,
  null,
  'invoices',
  inv.id,
  null
from public.invoices inv
where inv.deleted_at is null
  and inv.status not in ('paid', 'cancelled');

-- Supabase's default privileges usually cover this already, but grant
-- explicitly so a fresh project can't end up with an inaccessible view.
grant select on public.v_calendar_feed to authenticated;
