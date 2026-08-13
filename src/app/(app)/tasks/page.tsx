import { ClipboardList } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function TasksPage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      title="Tasks"
      description="The task board (kanban, list, and my-tasks views) with recurring tasks lands here."
      milestone="Milestone 6 — Tasks + Calendar"
    />
  );
}
