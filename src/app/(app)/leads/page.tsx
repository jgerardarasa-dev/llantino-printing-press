import { UsersRound } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function LeadsPage() {
  return (
    <ComingSoon
      icon={UsersRound}
      title="Leads"
      description="The leads pipeline (kanban by stage) and interaction log land with the CRM module."
      milestone="Milestone 2 — CRM"
    />
  );
}
