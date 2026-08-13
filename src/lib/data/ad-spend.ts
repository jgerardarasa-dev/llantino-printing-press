import "server-only";
import { desc, eq, sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { adSpend, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export async function listAdSpend(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: adSpend.id,
        month: adSpend.month,
        platform: adSpend.platform,
        campaignName: adSpend.campaignName,
        spendCentavos: adSpend.spendCentavos,
        leadsGenerated: adSpend.leadsGenerated,
        notes: adSpend.notes,
        createdByName: users.fullName,
        createdAt: adSpend.createdAt,
      })
      .from(adSpend)
      .leftJoin(users, eq(users.id, adSpend.createdBy))
      .orderBy(desc(adSpend.month))
  );
}
export type AdSpendRow = Awaited<ReturnType<typeof listAdSpend>>[number];

export type AdSpendSummary = {
  totalSpendCentavos: number;
  totalLeadsGenerated: number;
  /** SPEC §8: "compute cost per lead" — joins ad_spend against leads.source = 'meta_ads'. */
  totalLeadsFromSource: number;
  costPerLeadCentavos: number | null;
  /** "and cost per won client" — leads.source = 'meta_ads' that converted to a client with a non-cancelled JO. */
  wonClientsFromSource: number;
  costPerWonClientCentavos: number | null;
};

/**
 * Cost-per-lead and cost-per-won-client for Meta ad spend (SPEC §8, Meta
 * Ads section). "Leads" here is the actual `leads` table count where
 * `source = 'meta_ads'` — not `ad_spend.leads_generated` (a
 * platform-reported number the advertiser types in, which may not match
 * what actually landed in the CRM) — so cost-per-lead reflects the CRM's
 * own count, not Meta's self-reported one. `ad_spend.leads_generated` is
 * still stored and shown for reference/reconciliation.
 */
export async function getAdSpendSummary(user: CurrentUser, range: { from: string; to: string }): Promise<AdSpendSummary> {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx.execute<{
      total_spend_centavos: string;
      total_leads_generated: string;
      total_leads_from_source: string;
      won_clients_from_source: string;
    }>(sql`
      select
        coalesce((select sum(spend_centavos) from ad_spend where platform = 'meta' and month >= ${range.from} and month <= ${range.to}), 0) as total_spend_centavos,
        coalesce((select sum(leads_generated) from ad_spend where platform = 'meta' and month >= ${range.from} and month <= ${range.to}), 0) as total_leads_generated,
        coalesce((select count(*) from leads where source = 'meta_ads' and deleted_at is null and created_at::date >= ${range.from} and created_at::date <= ${range.to}), 0) as total_leads_from_source,
        coalesce((
          select count(distinct jo.client_id)
          from leads l
          join clients c on c.id = l.converted_client_id
          join job_orders jo on jo.client_id = c.id and jo.stage <> 'cancelled'
          where l.source = 'meta_ads' and l.deleted_at is null
            and l.created_at::date >= ${range.from} and l.created_at::date <= ${range.to}
        ), 0) as won_clients_from_source
    `);

    const totalSpendCentavos = Number(row.total_spend_centavos);
    const totalLeadsFromSource = Number(row.total_leads_from_source);
    const wonClientsFromSource = Number(row.won_clients_from_source);

    return {
      totalSpendCentavos,
      totalLeadsGenerated: Number(row.total_leads_generated),
      totalLeadsFromSource,
      costPerLeadCentavos: totalLeadsFromSource > 0 ? Math.round(totalSpendCentavos / totalLeadsFromSource) : null,
      wonClientsFromSource,
      costPerWonClientCentavos: wonClientsFromSource > 0 ? Math.round(totalSpendCentavos / wonClientsFromSource) : null,
    };
  });
}
