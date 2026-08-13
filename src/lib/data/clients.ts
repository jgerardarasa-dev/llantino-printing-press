import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { clients, contacts, interactions, jobOrders, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";

/**
 * All reads go through withUserContext() too, not just writes — RLS
 * policies key off auth.uid(), which is only set when the Drizzle
 * connection has been given the user's session context for the duration
 * of the query. A bare `db.select()` here would run as whatever
 * DATABASE_URL's role is with no JWT claim set, and depending on that
 * role's default privileges could return nothing (or, if it's a
 * BYPASSRLS role, everything) — using withUserContext keeps read and
 * write paths consistent and RLS-correct either way.
 */
export async function listClients(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: clients.id,
        companyName: clients.companyName,
        tradeName: clients.tradeName,
        industry: clients.industry,
        city: clients.city,
        region: clients.region,
        priceTier: clients.priceTier,
        status: clients.status,
        isVatRegistered: clients.isVatRegistered,
        ownerUserId: clients.ownerUserId,
        ownerName: users.fullName,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .leftJoin(users, eq(users.id, clients.ownerUserId))
      .where(isNull(clients.deletedAt))
      .orderBy(desc(clients.createdAt))
  );
}

export type ClientListRow = Awaited<ReturnType<typeof listClients>>[number];

export async function getClientDetail(user: CurrentUser, clientId: string) {
  return withUserContext(user.id, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) return null;

    const [clientContacts, clientInteractions, clientJobOrders, owner] = await Promise.all([
      tx
        .select()
        .from(contacts)
        .where(and(eq(contacts.clientId, clientId), isNull(contacts.deletedAt)))
        .orderBy(desc(contacts.isPrimary), desc(contacts.createdAt)),
      tx
        .select({
          id: interactions.id,
          type: interactions.type,
          summary: interactions.summary,
          occurredAt: interactions.occurredAt,
          nextAction: interactions.nextAction,
          nextActionDate: interactions.nextActionDate,
          userName: users.fullName,
        })
        .from(interactions)
        .leftJoin(users, eq(users.id, interactions.userId))
        .where(eq(interactions.clientId, clientId))
        .orderBy(desc(interactions.occurredAt))
        .limit(30),
      tx
        .select()
        .from(jobOrders)
        .where(eq(jobOrders.clientId, clientId))
        .orderBy(desc(jobOrders.orderDate)),
      client.ownerUserId
        ? tx.select().from(users).where(eq(users.id, client.ownerUserId)).limit(1)
        : Promise.resolve([]),
    ]);

    return {
      client,
      owner: owner[0] ?? null,
      contacts: clientContacts,
      interactions: clientInteractions,
      jobOrders: clientJobOrders,
    };
  });
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
