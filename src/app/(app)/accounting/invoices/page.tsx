import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ACCOUNTING_WRITE_ROLES, INVOICE_READ_ROLES } from "@/lib/auth/permissions";
import { listDeliveredJobOrdersAwaitingInvoice, listInvoices } from "@/lib/data/accounting";
import { DataTable } from "@/components/shared/data-table";
import { invoiceColumns } from "./columns";
import { GenerateInvoiceDialog } from "./generate-invoice-dialog";
import { AgingSummary } from "@/components/accounting/aging-summary";

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!INVOICE_READ_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Receipt className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Invoices are visible to Sales, Accounting, and Management only.</p>
      </div>
    );
  }

  const canEdit = ACCOUNTING_WRITE_ROLES.includes(user.role);
  const [invoiceRows, candidates] = await Promise.all([
    listInvoices(user),
    canEdit ? listDeliveredJobOrdersAwaitingInvoice(user) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {invoiceRows.length} total
            {canEdit && candidates.length > 0 && <span> · {candidates.length} delivered JO{candidates.length === 1 ? "" : "s"} awaiting invoice</span>}
          </p>
        </div>
        {canEdit && <GenerateInvoiceDialog candidates={candidates} />}
      </div>

      <AgingSummary invoices={invoiceRows} />

      <DataTable
        columns={invoiceColumns}
        data={invoiceRows}
        searchPlaceholder="Search invoices..."
        emptyState={<span className="text-sm text-muted-foreground">No invoices yet.</span>}
      />
    </div>
  );
}
