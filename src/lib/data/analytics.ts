import "server-only";
import { sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export type DateRange = { from: string; to: string };

/** Default analytics window: trailing 12 months, inclusive of today. */
export function defaultTwelveMonthRange(): DateRange {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Default analytics window: trailing 90 days. */
export function defaultNinetyDayRange(): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export type RevenueByMonth = { month: string; revenueCentavos: number };

/** SPEC §8: "Revenue by month." Revenue = invoice subtotal (ex-VAT — VAT is a pass-through, not company revenue). */
export async function getRevenueByMonth(user: CurrentUser, range: DateRange): Promise<RevenueByMonth[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ month: string; revenue_centavos: string }>(sql`
      select date_trunc('month', invoice_date)::date as month, coalesce(sum(subtotal_centavos), 0) as revenue_centavos
      from invoices
      where status <> 'cancelled' and deleted_at is null
        and invoice_date >= ${range.from} and invoice_date <= ${range.to}
      group by 1
      order by 1
    `);
    return Array.from(rows).map((r) => ({ month: r.month, revenueCentavos: Number(r.revenue_centavos) }));
  });
}

export type RevenueByDimension = { label: string; revenueCentavos: number };

export async function getRevenueByBoxStyle(user: CurrentUser, range: DateRange): Promise<RevenueByDimension[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ style: string | null; revenue_centavos: string }>(sql`
      select bs.style, coalesce(sum(i.subtotal_centavos), 0) as revenue_centavos
      from invoices i
      join job_orders jo on jo.id = i.job_order_id
      left join box_specs bs on bs.id = jo.box_spec_id
      where i.status <> 'cancelled' and i.deleted_at is null
        and i.invoice_date >= ${range.from} and i.invoice_date <= ${range.to}
      group by bs.style
      order by revenue_centavos desc
    `);
    return Array.from(rows).map((r) => ({ label: r.style ?? "Unspecified", revenueCentavos: Number(r.revenue_centavos) }));
  });
}

export async function getRevenueByIndustry(user: CurrentUser, range: DateRange): Promise<RevenueByDimension[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ industry: string | null; revenue_centavos: string }>(sql`
      select c.industry, coalesce(sum(i.subtotal_centavos), 0) as revenue_centavos
      from invoices i
      left join clients c on c.id = i.client_id
      where i.status <> 'cancelled' and i.deleted_at is null
        and i.invoice_date >= ${range.from} and i.invoice_date <= ${range.to}
      group by c.industry
      order by revenue_centavos desc
    `);
    return Array.from(rows).map((r) => ({ label: r.industry ?? "Unspecified", revenueCentavos: Number(r.revenue_centavos) }));
  });
}

export type ConversionRateRow = { label: string; sent: number; won: number; lost: number; conversionRatePct: number | null };

/** Quotations decided (approved/rejected) within range, grouped by preparer. "Sent" = decided total (won+lost). */
export async function getConversionRateBySalesperson(user: CurrentUser, range: DateRange): Promise<ConversionRateRow[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ salesperson: string | null; won: string; lost: string }>(sql`
      select u.full_name as salesperson,
        count(*) filter (where q.status = 'approved') as won,
        count(*) filter (where q.status = 'rejected') as lost
      from quotations q
      left join users u on u.id = q.prepared_by
      where q.status in ('approved','rejected') and q.deleted_at is null
        and q.updated_at::date >= ${range.from} and q.updated_at::date <= ${range.to}
      group by u.full_name
      order by u.full_name
    `);
    return Array.from(rows).map((r) => {
      const won = Number(r.won);
      const lost = Number(r.lost);
      return {
        label: r.salesperson ?? "Unassigned",
        sent: won + lost,
        won,
        lost,
        conversionRatePct: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : null,
      };
    });
  });
}

/** Source = the originating lead's source, falling back to the client's source when the quote wasn't lead-sourced. */
export async function getConversionRateBySource(user: CurrentUser, range: DateRange): Promise<ConversionRateRow[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ source: string | null; won: string; lost: string }>(sql`
      select coalesce(l.source, c.source) as source,
        count(*) filter (where q.status = 'approved') as won,
        count(*) filter (where q.status = 'rejected') as lost
      from quotations q
      left join leads l on l.id = q.lead_id
      left join clients c on c.id = q.client_id
      where q.status in ('approved','rejected') and q.deleted_at is null
        and q.updated_at::date >= ${range.from} and q.updated_at::date <= ${range.to}
      group by coalesce(l.source, c.source)
      order by coalesce(l.source, c.source)
    `);
    return Array.from(rows).map((r) => {
      const won = Number(r.won);
      const lost = Number(r.lost);
      return {
        label: r.source ?? "Unspecified",
        sent: won + lost,
        won,
        lost,
        conversionRatePct: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : null,
      };
    });
  });
}

export type LeadTimeTrendPoint = { month: string; avgDays: number | null; sampleSize: number };

/** SPEC §8: "Average lead time from JO creation to delivery, trended." */
export async function getLeadTimeTrend(user: CurrentUser, range: DateRange): Promise<LeadTimeTrendPoint[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ month: string; avg_days: string | null; n: string }>(sql`
      select date_trunc('month', actual_delivery_date)::date as month,
        avg(actual_delivery_date - order_date) as avg_days,
        count(*) as n
      from job_orders
      where actual_delivery_date is not null and deleted_at is null
        and actual_delivery_date >= ${range.from} and actual_delivery_date <= ${range.to}
      group by 1
      order by 1
    `);
    return Array.from(rows).map((r) => ({
      month: r.month,
      avgDays: r.avg_days !== null ? Math.round(Number(r.avg_days) * 10) / 10 : null,
      sampleSize: Number(r.n),
    }));
  });
}

export type WasteRateRow = { label: string; goodOutput: number; wasteCount: number; wasteRatePct: number };

export async function getWasteRateByStage(user: CurrentUser, range: DateRange): Promise<WasteRateRow[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ stage: string; good: string; waste: string }>(sql`
      select stage, coalesce(sum(good_output), 0) as good, coalesce(sum(waste_count), 0) as waste
      from jo_production_logs
      where deleted_at is null and created_at::date >= ${range.from} and created_at::date <= ${range.to}
      group by stage
      order by stage
    `);
    return Array.from(rows).map((r) => {
      const good = Number(r.good);
      const waste = Number(r.waste);
      return { label: r.stage, goodOutput: good, wasteCount: waste, wasteRatePct: good + waste > 0 ? Math.round((waste / (good + waste)) * 1000) / 10 : 0 };
    });
  });
}

export async function getWasteRateByOperator(user: CurrentUser, range: DateRange): Promise<WasteRateRow[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ operator: string | null; good: string; waste: string }>(sql`
      select u.full_name as operator, coalesce(sum(l.good_output), 0) as good, coalesce(sum(l.waste_count), 0) as waste
      from jo_production_logs l
      left join users u on u.id = l.operator_id
      where l.deleted_at is null and l.created_at::date >= ${range.from} and l.created_at::date <= ${range.to}
      group by u.full_name
      order by u.full_name
    `);
    return Array.from(rows).map((r) => {
      const good = Number(r.good);
      const waste = Number(r.waste);
      return { label: r.operator ?? "Unassigned", goodOutput: good, wasteCount: waste, wasteRatePct: good + waste > 0 ? Math.round((waste / (good + waste)) * 1000) / 10 : 0 };
    });
  });
}

export type RetentionStats = {
  clientsWithOrders: number;
  repeatClients: number;
  repeatRatePct: number | null;
};

/** SPEC §8: "Client retention / repeat order rate." All-time — a short window makes "repeat" meaningless. */
export async function getClientRetention(user: CurrentUser): Promise<RetentionStats> {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx.execute<{ clients_with_orders: string; repeat_clients: string }>(sql`
      select count(*) as clients_with_orders, count(*) filter (where jo_count > 1) as repeat_clients
      from (
        select client_id, count(*) as jo_count
        from job_orders
        where deleted_at is null and stage <> 'cancelled'
        group by client_id
      ) t
    `);
    const total = Number(row.clients_with_orders);
    const repeat = Number(row.repeat_clients);
    return {
      clientsWithOrders: total,
      repeatClients: repeat,
      repeatRatePct: total > 0 ? Math.round((repeat / total) * 1000) / 10 : null,
    };
  });
}
