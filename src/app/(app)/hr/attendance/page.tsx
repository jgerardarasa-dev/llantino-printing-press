import { ClipboardList } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function AttendancePage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      title="Attendance"
      description="Attendance entry and import land with the HR module."
      milestone="Milestone 7 — HR"
    />
  );
}
