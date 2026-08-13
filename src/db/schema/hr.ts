import { date, integer, numeric, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";

import { baseColumns, centavos } from "./_shared";
import { users } from "./core";
import {
  attendanceStatusEnum,
  employeeStatusEnum,
  employmentTypeEnum,
  holidayTypeEnum,
  leaveStatusEnum,
  leaveTypeEnum,
} from "./enums";

export const employees = pgTable("employees", {
  ...baseColumns(),
  userId: uuid("user_id").references(() => users.id),
  employeeNo: text("employee_no").notNull().unique(),
  fullName: text("full_name").notNull(),
  position: text("position"),
  department: text("department"),
  employmentType: employmentTypeEnum("employment_type").notNull().default("probationary"),
  dateHired: date("date_hired", { mode: "string" }).notNull(),
  dateRegularized: date("date_regularized", { mode: "string" }),
  dailyRateCentavos: centavos("daily_rate_centavos"),
  monthlyRateCentavos: centavos("monthly_rate_centavos"),
  sssNo: text("sss_no"),
  philhealthNo: text("philhealth_no"),
  pagibigNo: text("pagibig_no"),
  tin: text("tin"),
  emergencyContact: text("emergency_contact"),
  status: employeeStatusEnum("status").notNull().default("active"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const attendance = pgTable("attendance", {
  ...baseColumns(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  date: date("date", { mode: "string" }).notNull(),
  timeIn: time("time_in"),
  timeOut: time("time_out"),
  hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }),
  overtimeHours: numeric("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  status: attendanceStatusEnum("status").notNull().default("present"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const leaveRequests = pgTable("leave_requests", {
  ...baseColumns(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  days: numeric("days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
});

export const leaveBalances = pgTable("leave_balances", {
  ...baseColumns(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  year: integer("year").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  entitledDays: numeric("entitled_days", { precision: 5, scale: 2 }).notNull(),
  usedDays: numeric("used_days", { precision: 5, scale: 2 }).notNull().default("0"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const holidays = pgTable("holidays", {
  ...baseColumns(),
  date: date("date", { mode: "string" }).notNull(),
  name: text("name").notNull(),
  type: holidayTypeEnum("type").notNull().default("regular"),
  createdBy: uuid("created_by").references(() => users.id),
});
