import { redirect } from "next/navigation";
import { CircleDollarSign } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ACCOUNTING_WRITE_ROLES, EXPENSE_READ_ROLES } from "@/lib/auth/permissions";
import { listExpenses } from "@/lib/data/accounting";
import { listJobOrderOptions } from "@/lib/data/job-orders";
import { formatCentavos } from "@/lib/format";
import { DataTable } from "@/components/shared/data-table";
import { expenseColumns } from "./columns";
import { ExpenseFormDialog } from "./expense-form-dialog";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!EXPENSE_READ_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <CircleDollarSign className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Expenses are visible to Accounting and Management only.</p>
      </div>
    );
  }

  const canEdit = ACCOUNTING_WRITE_ROLES.includes(user.role);
  const [expenseRows, jobOrderOptions] = await Promise.all([
    listExpenses(user),
    canEdit ? listJobOrderOptions(user) : Promise.resolve([]),
  ]);
  const total = expenseRows.reduce((sum, e) => sum + e.amountCentavos, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">{expenseRows.length} recorded · {formatCentavos(total)} total</p>
        </div>
        {canEdit && <ExpenseFormDialog jobOrders={jobOrderOptions} />}
      </div>

      <DataTable
        columns={expenseColumns}
        data={expenseRows}
        searchPlaceholder="Search expenses..."
        emptyState={<span className="text-sm text-muted-foreground">No expenses recorded yet.</span>}
      />
    </div>
  );
}
