import { FileText } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function QuotationsPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Quotations"
      description="The quotation builder with live cost breakdown, quantity tiers, approvals, and PDF export lands here."
      milestone="Milestone 4 — Quotations"
    />
  );
}
