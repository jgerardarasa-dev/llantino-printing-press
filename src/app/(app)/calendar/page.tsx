import { Calendar } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function CalendarPage() {
  return (
    <ComingSoon
      icon={Calendar}
      title="Calendar"
      description="One unified calendar with toggleable layers: deliveries, production slots, task due dates, leave, PH holidays, and invoice due dates."
      milestone="Milestone 6 — Tasks + Calendar"
    />
  );
}
