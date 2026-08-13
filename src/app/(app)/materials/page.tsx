import { Boxes } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function MaterialsPage() {
  return (
    <ComingSoon
      icon={Boxes}
      title="Materials & Pricing"
      description="Materials and process-rate admin CRUD, plus the box spec builder that feeds the quotation engine."
      milestone="Milestone 3 — Pricing engine"
    />
  );
}
