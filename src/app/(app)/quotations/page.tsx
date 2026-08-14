import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { listQuotations } from "@/lib/data/quotations";
import { Button } from "@/components/ui/button";
import { QuotationsTable } from "./columns";

export default async function QuotationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!COMMERCIAL_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <FileText className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Quotations are visible to Sales, Accounting, and Management only.
        </p>
      </div>
    );
  }

  const quotationRows = await listQuotations(user);
  const canCreate = CRM_OWNER_ROLES.includes(user.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">{quotationRows.length} total</p>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/quotations/new">
              <Plus className="size-4" /> New quotation
            </Link>
          </Button>
        )}
      </div>

      <QuotationsTable
        data={quotationRows}
        searchPlaceholder="Search quotations..."
        emptyState={
          <div className="flex flex-col items-center gap-1 py-6">
            <FileText className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No quotations yet.</p>
          </div>
        }
      />
    </div>
  );
}
