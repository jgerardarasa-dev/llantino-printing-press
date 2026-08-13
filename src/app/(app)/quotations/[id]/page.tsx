import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { getQuotationDetail } from "@/lib/data/quotations";
import { formatCentavos, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakdownTable } from "@/components/quotations/breakdown-table";
import { StoredTierTable } from "@/components/quotations/stored-tier-table";
import { QuotationActions } from "@/components/quotations/quotation-actions";
import type { QuoteBreakdown } from "@/lib/pricing/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive" | "success"> = {
  draft: "outline",
  pending_approval: "warning",
  sent: "secondary",
  revised: "outline",
  approved: "success",
  rejected: "destructive",
  expired: "outline",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!COMMERCIAL_ROLES.includes(user.role)) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">You don&rsquo;t have access to quotations.</div>;
  }

  const detail = await getQuotationDetail(user, id);
  if (!detail) notFound();

  const { quotation, client, preparer, approver, item, tiers } = detail;
  const breakdown = item?.costBreakdown as QuoteBreakdown | undefined;
  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date() && ["sent", "approved"].includes(quotation.status);
  const displayStatus = isExpired ? "expired" : quotation.status;
  const canEdit = CRM_OWNER_ROLES.includes(user.role);
  const canApprove = user.role === "admin" || user.role === "management";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Quotations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{quotation.quoteNumber}</h1>
            <Badge variant={STATUS_VARIANT[displayStatus] ?? "outline"} className="capitalize">
              {displayStatus.replace("_", " ")}
            </Badge>
            {quotation.version > 1 && <Badge variant="outline">v{quotation.version}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client?.companyName ?? "No client"} · prepared by {preparer?.fullName ?? "—"} · {formatDate(quotation.createdAt)}
          </p>
          {quotation.status === "rejected" && quotation.rejectedReason && (
            <p className="mt-1 text-sm text-destructive">Rejected: {quotation.rejectedReason}</p>
          )}
          {quotation.status === "approved" && approver && (
            <p className="mt-1 text-sm text-success-foreground">Approved by {approver.fullName} on {formatDate(quotation.approvedAt)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Grand total</p>
          <p className="text-lg font-semibold tabular-nums">{formatCentavos(quotation.totalCentavos)}</p>
          <p className="text-xs text-muted-foreground">Valid until {formatDate(quotation.validUntil)}</p>
        </div>
      </div>

      <QuotationActions
        quotationId={quotation.id}
        status={quotation.status}
        requiresApproval={breakdown?.requiresApproval ?? false}
        canEdit={canEdit}
        canApprove={canApprove}
        hasContactEmail={Boolean(client)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cost breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {breakdown ? (
                <BreakdownTable breakdown={breakdown} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No item on this quotation yet.</p>
              )}
            </CardContent>
          </Card>

          {tiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quantity tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <StoredTierTable tiers={tiers} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{client?.companyName ?? "—"}</p>
              {client?.addressLine1 && <p className="text-muted-foreground">{client.addressLine1}</p>}
              {client?.city && <p className="text-muted-foreground">{client.city}</p>}
              {client?.tin && <p className="text-muted-foreground">TIN {client.tin}</p>}
            </CardContent>
          </Card>

          {quotation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{quotation.notes}</CardContent>
            </Card>
          )}

          {quotation.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{quotation.terms}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
