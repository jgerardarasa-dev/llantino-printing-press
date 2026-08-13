"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

import { CALENDAR_SOURCES, SOURCE_META, type CalendarSource } from "./source-meta";
import { NewEventDialog } from "./new-event-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    source: CalendarSource;
    eventType: string;
    description: string | null;
    department: string | null;
    location: string | null;
  };
};

export function UnifiedCalendar() {
  const router = useRouter();
  const [rawEvents, setRawEvents] = useState<FeedEvent[]>([]);
  const [enabledSources, setEnabledSources] = useState<Set<CalendarSource>>(new Set(CALENDAR_SOURCES));
  const [department, setDepartment] = useState<string>("all");
  const rangeRef = useRef<{ start: string; end: string } | null>(null);

  const fetchRange = useCallback(async (start: string, end: string) => {
    rangeRef.current = { start, end };
    const res = await fetch(`/calendar/feed?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (res.ok) setRawEvents(await res.json());
  }, []);

  const departments = useMemo(() => {
    const set = new Set<string>();
    rawEvents.forEach((e) => e.extendedProps.department && set.add(e.extendedProps.department));
    return Array.from(set).sort();
  }, [rawEvents]);

  const visibleEvents = useMemo(
    () =>
      rawEvents
        .filter((e) => enabledSources.has(e.extendedProps.source))
        .filter((e) => department === "all" || e.extendedProps.department === department)
        .map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
          backgroundColor: SOURCE_META[e.extendedProps.source]?.color,
          borderColor: SOURCE_META[e.extendedProps.source]?.color,
          extendedProps: e.extendedProps,
        })),
    [rawEvents, enabledSources, department]
  );

  function toggleSource(source: CalendarSource) {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {CALENDAR_SOURCES.map((source) => (
            <label key={source} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={enabledSources.has(source)}
                onCheckedChange={() => toggleSource(source)}
                style={{ borderColor: SOURCE_META[source].color }}
              />
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: SOURCE_META[source].color }} />
                {SOURCE_META[source].label}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {departments.length > 0 && (
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <NewEventDialog
            onCreated={() => {
              router.refresh();
              if (rangeRef.current) fetchRange(rangeRef.current.start, rangeRef.current.end);
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-2 [&_.fc]:text-xs sm:[&_.fc]:text-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
          height="auto"
          events={visibleEvents}
          datesSet={(arg) => {
            fetchRange(arg.startStr, arg.endStr);
          }}
          eventContent={renderEventContent}
        />
      </div>
    </div>
  );
}

function renderEventContent(arg: EventContentArg) {
  return (
    <div className="truncate px-0.5">
      <span className="font-medium">{arg.timeText && `${arg.timeText} `}</span>
      {arg.event.title}
    </div>
  );
}
