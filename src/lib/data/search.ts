import "server-only";
import { and, eq, ilike, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, jobOrders, quotations } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export type SearchResult = {
  id: string;
  kind: "client" | "job_order" | "quotation";
  title: string;
  subtitle: string | null;
  href: string;
};

const RESULTS_PER_KIND = 6;

/** SPEC §10: global search (⌘K) "across clients/JOs/quotes." RLS applies per-kind, same as every other query in the app. */
export async function searchGlobal(user: CurrentUser, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;

  return withUserContext(user.id, async (tx) => {
    const [clientRows, jobOrderRows, quotationRows] = await Promise.all([
      tx
        .select({ id: clients.id, companyName: clients.companyName, industry: clients.industry })
        .from(clients)
        .where(and(ilike(clients.companyName, pattern), isNull(clients.deletedAt)))
        .limit(RESULTS_PER_KIND),
      tx
        .select({ id: jobOrders.id, joNumber: jobOrders.joNumber, clientName: clients.companyName })
        .from(jobOrders)
        .leftJoin(clients, eq(clients.id, jobOrders.clientId))
        .where(ilike(jobOrders.joNumber, pattern))
        .limit(RESULTS_PER_KIND),
      tx
        .select({ id: quotations.id, quoteNumber: quotations.quoteNumber, clientName: clients.companyName })
        .from(quotations)
        .leftJoin(clients, eq(clients.id, quotations.clientId))
        .where(ilike(quotations.quoteNumber, pattern))
        .limit(RESULTS_PER_KIND),
    ]);

    return [
      ...clientRows.map((c): SearchResult => ({
        id: c.id,
        kind: "client",
        title: c.companyName,
        subtitle: c.industry,
        href: `/clients/${c.id}`,
      })),
      ...jobOrderRows.map((jo): SearchResult => ({
        id: jo.id,
        kind: "job_order",
        title: jo.joNumber,
        subtitle: jo.clientName,
        href: `/job-orders/${jo.id}`,
      })),
      ...quotationRows.map((q): SearchResult => ({
        id: q.id,
        kind: "quotation",
        title: q.quoteNumber,
        subtitle: q.clientName,
        href: `/quotations/${q.id}`,
      })),
    ];
  });
}
