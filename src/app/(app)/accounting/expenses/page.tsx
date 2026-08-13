import { CircleDollarSign } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function ExpensesPage() {
  return (
    <ComingSoon
      icon={CircleDollarSign}
      title="Expenses"
      description="Expense recording with JO tagging (for job costing) lands with the Accounting module."
      milestone="Milestone 8 — Accounting"
    />
  );
}
