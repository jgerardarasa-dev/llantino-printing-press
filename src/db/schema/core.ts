import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { attachmentKindEnum, userRoleEnum } from "./enums";

/**
 * `users.id` is the same UUID as the corresponding `auth.users.id` row
 * that Supabase Auth manages — no default here, the app assigns it at
 * invite time. The real FK to `auth.users(id)` is added in the RLS/
 * triggers SQL migration since Drizzle schema files don't model the
 * `auth` schema.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("staff"),
  isManager: boolean("is_manager").notNull().default(false),
  department: text("department"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
});

export const departments = pgTable("departments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  headUserId: uuid("head_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
});

/**
 * Singleton key/value settings row(s): company info, VAT rate, default
 * markup, quotation validity days, JO number format, approval thresholds.
 * Modeled as key/value rows (not one giant row) so new settings can be
 * added without a migration.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

/**
 * Written on every meaningful mutation — non-negotiable per SPEC. Every
 * write to a Job Order, Quotation, or Invoice MUST insert a row here;
 * other entities are encouraged to as well.
 */
export const activityLog = pgTable("activity_log", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  changes: jsonb("changes"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: text("size_bytes"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  kind: attachmentKindEnum("kind").notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const comments = pgTable("comments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  mentions: uuid("mentions").array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
