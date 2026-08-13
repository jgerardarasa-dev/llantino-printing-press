import { ClipboardList } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function JobOrdersPage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      title="Job Orders"
      description="The Job Order list and detail screen — stage pipeline, production logs, materials, QC checklist — lands here. This is the spine of the whole system."
      milestone="Milestone 5 — Job Orders"
    />
  );
}
