-- =========================================================================
-- jo_stage_history trigger — Milestone 5 (explicitly out of scope for
-- Milestone 1's activity_log trigger; see SPEC.md §10 build order and
-- the note left in 0001_rls_policies_and_triggers.sql).
--
-- Fires on every job_orders.stage change, unconditionally — this is the
-- ground truth the TS state machine (src/lib/job-orders/state-machine.ts)
-- can't bypass even if a future code path updates the row directly.
-- Legality of the transition itself is enforced in the Server Action
-- BEFORE the UPDATE runs (SPEC §6: "Implement ... an explicit transition
-- map in TypeScript. Illegal transitions must throw"); this trigger's
-- only job is to record what happened, not to gate it.
--
-- The optional rework note has no column to travel in on job_orders
-- itself, so the Server Action sets a session-local Postgres setting
-- immediately before the UPDATE, in the same transaction:
--   select set_config('llantino.stage_note', $1, true);
-- which this trigger reads via current_setting(..., true) (the `true`
-- means "don't error if unset" — a forward move with no note is fine).
-- =========================================================================

create or replace function public.record_jo_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_change timestamptz;
  v_duration_minutes integer;
  v_note text;
  v_is_rework boolean;
  v_from_idx integer;
  v_to_idx integer;
  -- Keep in sync with JOB_ORDER_STAGES in src/lib/constants/job-order-stages.ts
  -- (cancelled excluded — it's a terminal jump, never "rework").
  v_sequence text[] := array[
    'draft', 'for_artwork', 'artwork_approval', 'prepress', 'materials_ready',
    'printing', 'finishing', 'die_cutting', 'gluing_assembly', 'quality_check',
    'packing', 'ready_for_delivery', 'delivered', 'invoiced', 'paid', 'closed'
  ];
begin
  if old.stage is not distinct from new.stage then
    return new;
  end if;

  select changed_at into v_last_change
    from public.jo_stage_history
    where job_order_id = new.id
    order by changed_at desc
    limit 1;

  if v_last_change is null then
    v_last_change := new.created_at;
  end if;

  v_duration_minutes := greatest(0, round(extract(epoch from (now() - v_last_change)) / 60))::integer;

  v_note := nullif(current_setting('llantino.stage_note', true), '');

  v_from_idx := array_position(v_sequence, old.stage::text);
  v_to_idx := array_position(v_sequence, new.stage::text);

  v_is_rework := (
    old.stage::text <> 'cancelled' and new.stage::text <> 'cancelled'
    and v_from_idx is not null and v_to_idx is not null
    and v_to_idx < v_from_idx
  );

  insert into public.jo_stage_history
    (job_order_id, from_stage, to_stage, changed_by, changed_at, duration_minutes, note, is_rework)
  values
    (new.id, old.stage, new.stage, auth.uid(), now(), v_duration_minutes, v_note, coalesce(v_is_rework, false));

  return new;
end;
$$;

create trigger job_orders_stage_history
  after update on "job_orders"
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.record_jo_stage_change();
