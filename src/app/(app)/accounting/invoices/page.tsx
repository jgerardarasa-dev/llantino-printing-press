import { Receipt } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function InvoicesPage() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Invoices"
      description="Invoice generation from delivered JOs, payments, and aging land with the Accounting module."
      milestone="Milestone 8 — Accounting"
    />
  );
}
