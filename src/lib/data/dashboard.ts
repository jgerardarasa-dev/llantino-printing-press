import "server-only";
import { and, desc, eq, gte, inArray, isNull, lte, notInArray, sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import {
  attendance,
  clients,
  deliveries,
  employees,
  expenses,
  jobOrders,
  joMaterials,
  joProductionLogs,
  jobOrders as jobOrdersTable,
  leads,
  leaveBalances,
  leaveRequests,
  materials,
  payments,
  quotations,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import { STAGE_SEQUENCE } from "@/lib/job-orders/state-machine";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import { listJobOrders } from "@/lib/data/job-orders";

/**
 * Kept in sync with DONE_STAGES in lib/data/job-orders.ts — a JO in one
 * of these stages is finished-or-past-delivery, so "due"/"overdue"/
 * "in progress" style dashboard metrics stop counting it.
 */
const DONE_STAGES = ["delivered", "invoiced", "paid", "closed", "cancelled"] as const;

/** The stages that mean a JO is physically on the shop floor. */
const PRODUCTION_ACTIVE_STAGES = STAGE_SEQUENCE.filter(
  (s) => s !== "draft" && !(DONE_STAGES as readonly string[]).includes(s)
);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

type ManagementKpiRow = {
  active_jos: string;
  due_this_week: string;
  overdue: string;
  quotations_pending_approval: string;
  quotes_won_30d: string;
  quotes_lost_30d: string;
  revenue_mtd_centavos: string;
  receivables_outstanding_centavos: string;
  cash_collected_mtd_centavos: string;
};

export type ManagementKpis = {
  activeJos: number;
  dueThisWeek: number;
  overdue: number;
  quotationsPendingApproval: number;
  quotationWinRate30d: number | null;
  revenueMtdCentavos: number;
  receivablesOutstandingCentavos: number;
  cashCollectedMtdCentavos: number;
};

/** SPEC §8: management dashboard KPI row, one round trip. */
export async function getManagementKpis(user: CurrentUser): Promise<ManagementKpis> {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx.execute<ManagementKpiRow>(sql`
      select
        (select count(*) from job_orders where deleted_at is null and stage not in ('closed','cancelled')) as active_jos,
        (select count(*) from job_orders where deleted_at is null
           and stage not in ('delivered','invoiced','paid','closed','cancelled')
           and target_delivery_date is not null
           and target_delivery_date >= current_date and target_delivery_date <= current_date + interval '7 days'
        ) as due_this_week,
        (select count(*) from job_orders where deleted_at is null
           and stage not in ('delivered','invoiced','paid','closed','cancelled')
           and target_delivery_date is not null and target_delivery_date < current_date
        ) as overdue,
        (select count(*) from quotations where status = 'pending_approval' and deleted_at is null) as quotations_pending_approval,
        (select count(*) from quotations where status = 'approved' and approved_at >= now() - interval '30 days' and deleted_at is null) as quotes_won_30d,
        (select count(*) from quotations where status = 'rejected' and updated_at >= now() - interval '30 days' and deleted_at is null) as quotes_lost_30d,
        coalesce((select sum(total_centavos) from invoices where invoice_date >= date_trunc('month', current_date)::date and status <> 'cancelled' and deleted_at is null), 0) as revenue_mtd_centavos,
        coalesce((select sum(balance_centavos) from invoices where status not in ('paid','cancelled') and deleted_at is null), 0) as receivables_outstanding_centavos,
        coalesce((select sum(amount_centavos) from payments where payment_date >= date_trunc('month', current_date)::date and deleted_at is null), 0) as cash_collected_mtd_centavos
    `);

    const won = Number(row.quotes_won_30d);
    const lost = Number(row.quotes_lost_30d);
    return {
      activeJos: Number(row.active_jos),
      dueThisWeek: Number(row.due_this_week),
      overdue: Number(row.overdue),
      quotationsPendingApproval: Number(row.quotations_pending_approval),
      quotationWinRate30d: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : null,
      revenueMtdCentavos: Number(row.revenue_mtd_centavos),
      receivablesOutstandingCentavos: Number(row.receivables_outstanding_centavos),
      cashCollectedMtdCentavos: Number(row.cash_collected_mtd_centavos),
    };
  });
}

export type StageFunnelEntry = { stage: JobOrderStage; count: number; valueCentavos: number | null };

/** SPEC §8: "JO pipeline funnel: count and peso value at each stage." */
export async function getStageFunnel(user: CurrentUser): Promise<StageFunnelEntry[]> {
  const hideCommercials = user.role === "production";
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ stage: JobOrderStage; count: string; value_centavos: string }>(sql`
      select stage, count(*) as count, coalesce(sum(total_centavos), 0) as value_centavos
      from job_orders
      where deleted_at is null and stage <> 'cancelled'
      group by stage
    `);
    const byStage = new Map(Array.from(rows).map((r) => [r.stage, r]));
    return STAGE_SEQUENCE.map((stage) => {
      const r = byStage.get(stage);
      return {
        stage,
        count: r ? Number(r.count) : 0,
        valueCentavos: hideCommercials ? null : r ? Number(r.value_centavos) : 0,
      };
    });
  });
}

export type BottleneckEntry = { stage: JobOrderStage; avgHours: number; sampleSize: number };

/** SPEC §8: "average hours spent per stage over the last 90 days, derived from jo_stage_history." */
export async function getBottleneckStats(user: CurrentUser): Promise<BottleneckEntry[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ stage: JobOrderStage; avg_minutes: string; n: string }>(sql`
      select from_stage as stage, avg(duration_minutes) as avg_minutes, count(*) as n
      from jo_stage_history
      where changed_at >= now() - interval '90 days' and from_stage is not null
      group by from_stage
    `);
    const byStage = new Map(Array.from(rows).map((r) => [r.stage, r]));
    return STAGE_SEQUENCE.filter((s) => s !== "closed").map((stage) => {
      const r = byStage.get(stage);
      return {
        stage,
        avgHours: r ? Math.round((Number(r.avg_minutes) / 60) * 10) / 10 : 0,
        sampleSize: r ? Number(r.n) : 0,
      };
    });
  });
}

export type DeliveryThisWeek = {
  id: string;
  drNumber: string;
  scheduledDate: string | null;
  status: string;
  jobOrderId: string;
  joNumber: string | null;
  clientName: string | null;
  quantity: number;
};

export async function getDeliveriesThisWeek(user: CurrentUser): Promise<DeliveryThisWeek[]> {
  const today = isoDate(new Date());
  const weekAhead = isoDate(addDays(new Date(), 7));
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: deliveries.id,
        drNumber: deliveries.drNumber,
        scheduledDate: deliveries.scheduledDate,
        status: deliveries.status,
        jobOrderId: deliveries.jobOrderId,
        joNumber: jobOrders.joNumber,
        clientName: clients.companyName,
        quantity: deliveries.quantity,
      })
      .from(deliveries)
      .leftJoin(jobOrders, eq(jobOrders.id, deliveries.jobOrderId))
      .leftJoin(clients, eq(clients.id, jobOrders.clientId))
      .where(
        and(
          gte(deliveries.scheduledDate, today),
          lte(deliveries.scheduledDate, weekAhead),
          notInArray(deliveries.status, ["delivered", "cancelled"])
        )
      )
      .orderBy(deliveries.scheduledDate)
  );
}

export type TopClient = { clientId: string | null; clientName: string | null; revenueCentavos: number };

/** SPEC §8: "Top 10 clients by revenue (period selectable)." Revenue = invoice subtotal, ex-VAT. */
export async function getTopClientsByRevenue(
  user: CurrentUser,
  range: { from: string; to: string },
  limit = 10
): Promise<TopClient[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<{ client_id: string | null; client_name: string | null; revenue_centavos: string }>(sql`
      select i.client_id, c.company_name as client_name, coalesce(sum(i.subtotal_centavos), 0) as revenue_centavos
      from invoices i
      left join clients c on c.id = i.client_id
      where i.status <> 'cancelled' and i.deleted_at is null
        and i.invoice_date >= ${range.from} and i.invoice_date <= ${range.to}
      group by i.client_id, c.company_name
      order by revenue_centavos desc
      limit ${limit}
    `);
    return Array.from(rows).map((r) => ({
      clientId: r.client_id,
      clientName: r.client_name,
      revenueCentavos: Number(r.revenue_centavos),
    }));
  });
}

export async function getAtRiskJobs(user: CurrentUser) {
  const rows = await listJobOrders(user);
  return rows
    .filter((r) => r.isAtRisk)
    .sort((a, b) => (a.targetDeliveryDate ?? "9999").localeCompare(b.targetDeliveryDate ?? "9999"));
}

// ---------------------------------------------------------------------------
// Sales dashboard (SPEC §8)
// ---------------------------------------------------------------------------

export async function getSalesDashboardData(user: CurrentUser) {
  return withUserContext(user.id, async (tx) => {
    const [leadsByStageRows, quotesAwaiting, quotesExpiring, clientsNoInteraction, wonLostRows, myJos] =
      await Promise.all([
        tx
          .select({ stage: leads.stage, count: sql<string>`count(*)` })
          .from(leads)
          .where(and(eq(leads.assignedTo, user.id), notInArray(leads.stage, ["won", "lost"])))
          .groupBy(leads.stage),
        tx
          .select({ id: quotations.id, quoteNumber: quotations.quoteNumber, clientName: clients.companyName, validUntil: quotations.validUntil })
          .from(quotations)
          .leftJoin(clients, eq(clients.id, quotations.clientId))
          .where(and(eq(quotations.preparedBy, user.id), eq(quotations.status, "sent")))
          .orderBy(desc(quotations.sentAt)),
        tx
          .select({ id: quotations.id, quoteNumber: quotations.quoteNumber, clientName: clients.companyName, validUntil: quotations.validUntil })
          .from(quotations)
          .leftJoin(clients, eq(clients.id, quotations.clientId))
          .where(
            and(
              eq(quotations.preparedBy, user.id),
              eq(quotations.status, "sent"),
              sql`${quotations.validUntil} is not null and ${quotations.validUntil} <= now() + interval '7 days'`
            )
          )
          .orderBy(quotations.validUntil),
        tx.execute<{ id: string; company_name: string; last_interaction: string | null }>(sql`
          select c.id, c.company_name, max(i.occurred_at) as last_interaction
          from clients c
          left join interactions i on i.client_id = c.id
          where c.owner_user_id = ${user.id} and c.deleted_at is null
          group by c.id, c.company_name
          having max(i.occurred_at) is null or max(i.occurred_at) < now() - interval '30 days'
          order by last_interaction asc nulls first
        `),
        tx
          .select({ stage: leads.stage, count: sql<string>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.assignedTo, user.id),
              inArray(leads.stage, ["won", "lost"]),
              sql`${leads.updatedAt} >= date_trunc('month', now())`
            )
          )
          .groupBy(leads.stage),
        tx
          .select({
            id: jobOrders.id,
            joNumber: jobOrders.joNumber,
            clientName: clients.companyName,
            stage: jobOrders.stage,
            totalCentavos: jobOrders.totalCentavos,
          })
          .from(jobOrders)
          .leftJoin(clients, eq(clients.id, jobOrders.clientId))
          .where(and(eq(jobOrders.salesOwnerId, user.id), notInArray(jobOrders.stage, ["closed", "cancelled"])))
          .orderBy(desc(jobOrders.createdAt)),
      ]);

    return {
      leadsByStage: leadsByStageRows.map((r) => ({ stage: r.stage, count: Number(r.count) })),
      quotationsAwaitingResponse: quotesAwaiting,
      quotationsExpiring7d: quotesExpiring,
      clientsNoInteraction30d: Array.from(clientsNoInteraction).map((r) => ({
        id: r.id,
        companyName: r.company_name,
        lastInteraction: r.last_interaction,
      })),
      wonThisMonth: Number(wonLostRows.find((r) => r.stage === "won")?.count ?? 0),
      lostThisMonth: Number(wonLostRows.find((r) => r.stage === "lost")?.count ?? 0),
      myJobOrdersInProgress: myJos,
    };
  });
}

// ---------------------------------------------------------------------------
// Production dashboard (SPEC §8)
// ---------------------------------------------------------------------------

export async function getProductionDashboardData(user: CurrentUser) {
  const weekStart = isoDate(startOfWeek(new Date()));

  return withUserContext(user.id, async (tx) => {
    const [queue, myStageJos, shortageRows, wasteRows, outputRows] = await Promise.all([
      tx
        .select({
          id: jobOrders.id,
          joNumber: jobOrders.joNumber,
          clientName: clients.companyName,
          stage: jobOrders.stage,
          priority: jobOrders.priority,
          targetDeliveryDate: jobOrders.targetDeliveryDate,
        })
        .from(jobOrders)
        .leftJoin(clients, eq(clients.id, jobOrders.clientId))
        .where(and(inArray(jobOrders.stage, PRODUCTION_ACTIVE_STAGES), eq(jobOrders.isOnHold, false)))
        .orderBy(
          sql`case ${jobOrders.priority} when 'critical' then 0 when 'rush' then 1 else 2 end`,
          sql`${jobOrders.targetDeliveryDate} nulls last`
        ),
      tx
        .select({ id: jobOrders.id, joNumber: jobOrders.joNumber, stage: jobOrders.stage })
        .from(jobOrders)
        .where(and(eq(jobOrders.productionOwnerId, user.id), inArray(jobOrders.stage, PRODUCTION_ACTIVE_STAGES))),
      tx
        .select({
          jobOrderId: joMaterials.jobOrderId,
          joNumber: jobOrdersTable.joNumber,
          materialName: materials.name,
          sheetsPlanned: joMaterials.sheetsPlanned,
          sheetsIssued: joMaterials.sheetsIssued,
        })
        .from(joMaterials)
        .leftJoin(jobOrdersTable, eq(jobOrdersTable.id, joMaterials.jobOrderId))
        .leftJoin(materials, eq(materials.id, joMaterials.materialId))
        .where(
          and(
            sql`${joMaterials.sheetsIssued} < ${joMaterials.sheetsPlanned}`,
            inArray(jobOrdersTable.stage, PRODUCTION_ACTIVE_STAGES)
          )
        ),
      tx
        .select({ goodOutput: sql<string>`coalesce(sum(${joProductionLogs.goodOutput}),0)`, wasteCount: sql<string>`coalesce(sum(${joProductionLogs.wasteCount}),0)` })
        .from(joProductionLogs)
        .where(gte(joProductionLogs.createdAt, new Date(weekStart))),
      tx
        .select({ quantityOrdered: jobOrders.quantityOrdered, quantityProduced: jobOrders.quantityProduced })
        .from(jobOrders)
        .where(inArray(jobOrders.stage, PRODUCTION_ACTIVE_STAGES)),
    ]);

    const good = Number(wasteRows[0]?.goodOutput ?? 0);
    const waste = Number(wasteRows[0]?.wasteCount ?? 0);
    const totalOrdered = outputRows.reduce((s, r) => s + r.quantityOrdered, 0);
    const totalProduced = outputRows.reduce((s, r) => s + r.quantityProduced, 0);

    return {
      todaysQueue: queue,
      myStageJobOrders: myStageJos,
      materialsShortages: shortageRows,
      wasteRateThisWeek: good + waste > 0 ? Math.round((waste / (good + waste)) * 1000) / 10 : 0,
      wasteCountThisWeek: waste,
      goodOutputThisWeek: good,
      outputVsPlan: { ordered: totalOrdered, produced: totalProduced },
    };
  });
}

// ---------------------------------------------------------------------------
// Accounting dashboard (SPEC §8)
// ---------------------------------------------------------------------------

export async function getAccountingDashboardData(user: CurrentUser) {
  const weekStart = isoDate(startOfWeek(new Date()));
  const weekEnd = isoDate(addDays(startOfWeek(new Date()), 6));
  const monthStart = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return withUserContext(user.id, async (tx) => {
    const [unbilled, paymentsThisWeek, expensesThisMonth, cashRows] = await Promise.all([
      tx
        .select({
          id: jobOrders.id,
          joNumber: jobOrders.joNumber,
          clientName: clients.companyName,
          totalCentavos: jobOrders.totalCentavos,
          actualDeliveryDate: jobOrders.actualDeliveryDate,
        })
        .from(jobOrders)
        .leftJoin(clients, eq(clients.id, jobOrders.clientId))
        .where(eq(jobOrders.stage, "delivered")),
      tx
        .select({
          id: payments.id,
          amountCentavos: payments.amountCentavos,
          paymentDate: payments.paymentDate,
          method: payments.method,
          clientName: clients.companyName,
        })
        .from(payments)
        .leftJoin(clients, eq(clients.id, payments.clientId))
        .where(and(gte(payments.paymentDate, weekStart), lte(payments.paymentDate, weekEnd)))
        .orderBy(desc(payments.paymentDate)),
      tx
        .select({ category: expenses.category, total: sql<string>`coalesce(sum(${expenses.amountCentavos}),0)` })
        .from(expenses)
        .where(gte(expenses.expenseDate, monthStart))
        .groupBy(expenses.category),
      tx.execute<{ week: string; cash_in: string; cash_out: string }>(sql`
        select date_trunc('week', d)::date as week,
          coalesce((select sum(amount_centavos) from payments where date_trunc('week', payment_date) = date_trunc('week', d)), 0) as cash_in,
          coalesce((select sum(amount_centavos) from expenses where date_trunc('week', expense_date) = date_trunc('week', d) and deleted_at is null), 0) as cash_out
        from generate_series(now() - interval '7 weeks', now(), interval '1 week') as d
        group by d
        order by d
      `),
    ]);

    return {
      unbilledDeliveredJobOrders: unbilled,
      paymentsThisWeek,
      paymentsThisWeekTotalCentavos: paymentsThisWeek.reduce((s, p) => s + p.amountCentavos, 0),
      expensesThisMonthByCategory: expensesThisMonth.map((r) => ({ category: r.category, totalCentavos: Number(r.total) })),
      expensesThisMonthTotalCentavos: expensesThisMonth.reduce((s, r) => s + Number(r.total), 0),
      cashInOutByWeek: Array.from(cashRows).map((r) => ({
        week: r.week,
        cashInCentavos: Number(r.cash_in),
        cashOutCentavos: Number(r.cash_out),
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// HR dashboard (SPEC §8)
// ---------------------------------------------------------------------------

export async function getHrDashboardData(user: CurrentUser) {
  const today = isoDate(new Date());
  const weekStart = isoDate(startOfWeek(new Date()));

  return withUserContext(user.id, async (tx) => {
    const [[headcountRow], onLeaveToday, pendingLeave, exceptions, probationary] = await Promise.all([
      tx.select({ count: sql<string>`count(*)` }).from(employees).where(eq(employees.status, "active")),
      tx
        .select({
          id: leaveRequests.id,
          employeeName: employees.fullName,
          leaveType: leaveRequests.leaveType,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(employees.id, leaveRequests.employeeId))
        .where(
          and(
            eq(leaveRequests.status, "approved"),
            lte(leaveRequests.startDate, today),
            gte(leaveRequests.endDate, today)
          )
        ),
      tx
        .select({
          id: leaveRequests.id,
          employeeName: employees.fullName,
          leaveType: leaveRequests.leaveType,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          days: leaveRequests.days,
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(employees.id, leaveRequests.employeeId))
        .where(eq(leaveRequests.status, "pending"))
        .orderBy(leaveRequests.startDate),
      tx
        .select({
          id: attendance.id,
          employeeName: employees.fullName,
          date: attendance.date,
          status: attendance.status,
        })
        .from(attendance)
        .leftJoin(employees, eq(employees.id, attendance.employeeId))
        .where(and(gte(attendance.date, weekStart), inArray(attendance.status, ["absent", "late"])))
        .orderBy(desc(attendance.date)),
      tx
        .select({ id: employees.id, fullName: employees.fullName, dateHired: employees.dateHired })
        .from(employees)
        .where(
          and(
            eq(employees.employmentType, "probationary"),
            eq(employees.status, "active"),
            isNull(employees.dateRegularized)
          )
        ),
    ]);

    const upcomingRegularization = probationary
      .map((e) => {
        const target = addDays(new Date(e.dateHired), 182); // ~6 months
        return { id: e.id, fullName: e.fullName, dateHired: e.dateHired, regularizationDate: isoDate(target) };
      })
      .sort((a, b) => a.regularizationDate.localeCompare(b.regularizationDate));

    return {
      headcount: Number(headcountRow?.count ?? 0),
      onLeaveToday,
      pendingLeaveRequests: pendingLeave,
      attendanceExceptionsThisWeek: exceptions,
      upcomingRegularization,
    };
  });
}

// ---------------------------------------------------------------------------
// Staff dashboard (SPEC §8)
// ---------------------------------------------------------------------------

export async function getStaffDashboardData(user: CurrentUser) {
  return withUserContext(user.id, async (tx) => {
    const [myTasksRows, myEmployee] = await Promise.all([
      tx.execute<{ id: string; title: string; status: string; priority: string; due_date: string | null }>(sql`
        select id, title, status, priority, due_date from tasks
        where assignee_id = ${user.id} and deleted_at is null and status not in ('done','cancelled')
        order by due_date asc nulls last
      `),
      tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1),
    ]);

    const employeeId = myEmployee[0]?.id ?? null;
    const currentYear = new Date().getFullYear();

    const [myAttendanceRows, myLeaveBalanceRows] = await Promise.all([
      employeeId
        ? tx
            .select({ id: attendance.id, date: attendance.date, status: attendance.status, hoursWorked: attendance.hoursWorked })
            .from(attendance)
            .where(eq(attendance.employeeId, employeeId))
            .orderBy(desc(attendance.date))
            .limit(10)
        : Promise.resolve([]),
      employeeId
        ? tx
            .select({
              leaveType: leaveBalances.leaveType,
              entitledDays: leaveBalances.entitledDays,
              usedDays: leaveBalances.usedDays,
            })
            .from(leaveBalances)
            .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, currentYear)))
        : Promise.resolve([]),
    ]);

    return {
      myTasks: Array.from(myTasksRows).map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        dueDate: r.due_date,
      })),
      myAttendance: myAttendanceRows,
      myLeaveBalance: myLeaveBalanceRows,
      hasEmployeeRecord: employeeId !== null,
    };
  });
}
