import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ACCOUNTING_WRITE_ROLES, INVOICE_READ_ROLES } from "@/lib/auth/permissions";
import { getInvoiceDetail } from "@/lib/data/accounting";
import { formatCentavos, formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordPaymentDialog } from "../record-payment-dialog";

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "warning" | "success"> = {
  draft: "outline",
  issued: "secondary",
  partially_paid: "warning",
  paid: "success",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!INVOICE_READ_ROLES.includes(user.role)) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">You don&rsquo;t have access to invoices.</div>;
  }

  const detail = await getInvoiceDetail(user, id);
  if (!detail) notFound();
  const { invoice, client, jobOrder, payments } = detail;
  const canRecordPayment = ACCOUNTING_WRITE_ROLES.includes(user.role) && invoice.balanceCentavos > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/accounting/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Invoices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{invoice.invoiceNumber}</h1>
            <Badge variant={STATUS_VARIANT[invoice.status] ?? "outline"} className="capitalize">{invoice.status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client?.companyName ?? "—"} {jobOrder && `· ${jobOrder.joNumber}`} · issued {formatDate(invoice.invoiceDate)} · due {formatDate(invoice.dueDate)}
          </p>
        </div>
        {canRecordPayment && <RecordPaymentDialog invoiceId={invoice.id} balanceCentavos={invoice.balanceCentavos} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Amounts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCentavos(invoice.subtotalCentavos)} />
            <Row label="VAT" value={formatCentavos(invoice.vatCentavos)} />
            <Row label="Withholding tax" value={formatCentavos(invoice.withholdingTaxCentavos)} />
            <Row label="Total" value={formatCentavos(invoice.totalCentavos)} className="font-medium" />
            <Row label="Paid" value={formatCentavos(invoice.amountPaidCentavos)} />
            <Row label="Balance" value={formatCentavos(invoice.balanceCentavos)} className="text-base font-semibold" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Client</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{client?.companyName ?? "—"}</p>
            {client?.addressLine1 && <p className="text-muted-foreground">{client.addressLine1}</p>}
            {client?.tin && <p className="text-muted-foreground">TIN {client.tin}</p>}
            {jobOrder && (
              <Link href={`/job-orders/${jobOrder.id}`} className="inline-block pt-1 text-primary hover:underline">
                View job order →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {payments.map(({ payment, receivedByName }) => (
                <li key={payment.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium tabular-nums">{formatCentavos(payment.amountCentavos)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.method.replace("_", " ")} {payment.referenceNo && `· ${payment.referenceNo}`} · {receivedByName ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(payment.paymentDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${className ?? ""}`}>{value}</span>
    </div>
  );
}
