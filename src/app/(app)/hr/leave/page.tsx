import { Calendar } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function LeavePage() {
  return (
    <ComingSoon
      icon={Calendar}
      title="Leave"
      description="Leave requests, the approval flow, and leave balances land with the HR module."
      milestone="Milestone 7 — HR"
    />
  );
}
