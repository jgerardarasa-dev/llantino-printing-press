import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { UnifiedCalendar } from "@/components/calendar/unified-calendar";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          One view over manual events, JO delivery targets, task due dates, approved leave, PH holidays, and invoice due dates.
        </p>
      </div>
      <UnifiedCalendar />
    </div>
  );
}
