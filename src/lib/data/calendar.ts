import "server-only";
import { sql } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export type CalendarFeedEntry = {
  feedId: string;
  source: string;
  eventType: string;
  title: string;
  description: string | null;
  department: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  colour: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string;
  ownerId: string | null;
};

type CalendarFeedRow = {
  feed_id: string;
  source: string;
  event_type: string;
  title: string;
  description: string | null;
  department: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  colour: string | null;
  related_entity_type: string | null;
  related_entity_id: string;
  owner_id: string | null;
};

/** Reads the v_calendar_feed view (0003_v_calendar_feed_view.sql) for a date range. */
export async function listCalendarFeed(user: CurrentUser, range: { from: Date; to: Date }): Promise<CalendarFeedEntry[]> {
  return withUserContext(user.id, async (tx) => {
    const rows = await tx.execute<CalendarFeedRow>(sql`
      select feed_id, source, event_type, title, description, department,
             start_at, end_at, all_day, location, colour,
             related_entity_type, related_entity_id, owner_id
      from public.v_calendar_feed
      where start_at >= ${range.from.toISOString()} and start_at <= ${range.to.toISOString()}
      order by start_at asc
    `);

    return Array.from(rows).map((r) => ({
      feedId: r.feed_id,
      source: r.source,
      eventType: r.event_type,
      title: r.title,
      description: r.description,
      department: r.department,
      startAt: r.start_at,
      endAt: r.end_at,
      allDay: r.all_day,
      location: r.location,
      colour: r.colour,
      relatedEntityType: r.related_entity_type,
      relatedEntityId: r.related_entity_id,
      ownerId: r.owner_id,
    }));
  });
}
