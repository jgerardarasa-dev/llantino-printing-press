import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { baseColumns } from "./_shared";
import { users } from "./core";
import { calendarEventTypeEnum, taskPriorityEnum, taskStatusEnum } from "./enums";

export const tasks = pgTable("tasks", {
  ...baseColumns(),
  title: text("title").notNull(),
  description: text("description"),
  department: text("department"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  watchers: uuid("watchers").array().notNull().default(sql`'{}'::uuid[]`),
  /** Links a task to a JO, quotation, client, etc. — polymorphic pointer. */
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  priority: taskPriorityEnum("priority").notNull().default("normal"),
  status: taskStatusEnum("status").notNull().default("todo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  blockedReason: text("blocked_reason"),
  checklist: jsonb("checklist").notNull().default([]),
  recurrenceRule: text("recurrence_rule"),
  createdBy: uuid("created_by").references(() => users.id),
});

/**
 * Manual events only. The unified calendar the UI renders is
 * `v_calendar_feed` — a Postgres VIEW that UNIONs this table with JO
 * target delivery dates, JO stage deadlines, task due dates, approved
 * leave, PH holidays, and invoice due dates (SPEC §5, calendar rule).
 * Defined in db/migrations/0002_views_and_triggers.sql since it spans
 * tables across every domain.
 */
export const calendarEvents = pgTable("calendar_events", {
  ...baseColumns(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: calendarEventTypeEnum("event_type").notNull().default("other"),
  department: text("department"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location"),
  attendees: uuid("attendees").array().notNull().default(sql`'{}'::uuid[]`),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  colour: text("colour"),
  createdBy: uuid("created_by").references(() => users.id),
});
