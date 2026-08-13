import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { getClientDetail } from "@/lib/data/clients";
import { listAssignableOwners } from "@/lib/data/users";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { ClientFormSheet } from "../client-form-sheet";
import { ContactFormDialog } from "@/components/crm/contact-form-dialog";
import { ContactsList } from "@/components/crm/contacts-list";
import { InteractionForm } from "@/components/crm/interaction-form";
import { InteractionsList } from "@/components/crm/interactions-list";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!COMMERCIAL_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        You don&rsquo;t have access to client details.
      </div>
    );
  }

  const [detail, owners] = await Promise.all([getClientDetail(user, id), listAssignableOwners(user)]);
  if (!detail) notFound();

  const { client, owner, contacts, interactions, jobOrders } = detail;
  const canEdit = CRM_OWNER_ROLES.includes(user.role);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{client.companyName}</h1>
            <Badge variant="outline" className="capitalize">{client.priceTier}</Badge>
            <Badge variant="secondary" className="capitalize">{client.status}</Badge>
            {client.isVatRegistered && <Badge variant="outline">VAT-registered</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[client.industry, client.city, client.region].filter(Boolean).join(" · ") || "No details on file"}
          </p>
        </div>
        {canEdit && (
          <ClientFormSheet
            owners={owners}
            client={{ ...client, ownerName: owner?.fullName ?? null }}
            trigger={
              <button className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs hover:bg-accent">
                Edit
              </button>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column: profile + contacts */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Account owner" value={owner?.fullName ?? "Unassigned"} />
              <Row label="TIN" value={client.tin ?? "—"} />
              <Row label="Address" value={client.addressLine1 ?? "—"} />
              <Row label="Payment terms" value={`${client.paymentTermsDays} days`} />
              <Row label="Credit limit" value={formatCentavos(client.creditLimitCentavos)} />
              <Row label="Source" value={client.source.replace("_", " ")} className="capitalize" />
              <Row label="Client since" value={formatDate(client.createdAt)} />
              {client.notes && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              {canEdit && <ContactFormDialog clientId={client.id} />}
            </CardHeader>
            <CardContent>
              <ContactsList clientId={client.id} contacts={contacts} canEdit={canEdit} />
            </CardContent>
          </Card>
        </div>

        {/* Middle column: job orders, quotations, invoices */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Job Orders ({jobOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {jobOrders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No job orders yet.</p>
              ) : (
                <ul className="space-y-2">
                  {jobOrders.map((jo) => (
                    <li
                      key={jo.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{jo.joNumber}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {jo.quantityOrdered.toLocaleString()} pcs · {formatDate(jo.targetDeliveryDate)}
                        </p>
                      </div>
                      <StageBadge stage={jo.stage} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyModuleNote icon={FileText} milestone="Milestone 4 — Quotations" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyModuleNote icon={Receipt} milestone="Milestone 8 — Accounting" />
            </CardContent>
          </Card>
        </div>

        {/* Right column: interactions */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Log an interaction</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionForm clientId={client.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interaction history</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionsList interactions={interactions} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

function EmptyModuleNote({ icon: Icon, milestone }: { icon: typeof FileText; milestone: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Arrives in {milestone}.</p>
    </div>
  );
}
