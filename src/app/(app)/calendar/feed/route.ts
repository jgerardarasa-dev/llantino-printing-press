import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listCalendarFeed } from "@/lib/data/calendar";

/**
 * JSON event source for FullCalendar (`events: { url: "/calendar/feed" }`).
 * Reads start/end from FullCalendar's own fetch params and returns
 * FullCalendar-shaped events sourced from v_calendar_feed.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const from = start ? new Date(start) : new Date(Date.now() - 30 * 86_400_000);
  const to = end ? new Date(end) : new Date(Date.now() + 60 * 86_400_000);

  const entries = await listCalendarFeed(user, { from, to });

  const events = entries.map((e) => ({
    id: e.feedId,
    title: e.title,
    start: e.startAt,
    end: e.endAt ?? undefined,
    allDay: e.allDay,
    extendedProps: {
      source: e.source,
      eventType: e.eventType,
      description: e.description,
      department: e.department,
      location: e.location,
      relatedEntityType: e.relatedEntityType,
      relatedEntityId: e.relatedEntityId,
    },
  }));

  return NextResponse.json(events);
}
