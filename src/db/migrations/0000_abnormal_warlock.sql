CREATE TYPE "public"."attachment_kind" AS ENUM('artwork', 'dieline', 'proof', 'po', 'receipt', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'half_day', 'leave', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."box_style" AS ENUM('straight_tuck', 'reverse_tuck', 'auto_lock_bottom', 'snap_lock', 'mailer', 'pizza', 'sleeve', 'tray_lid', 'custom');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_type" AS ENUM('delivery', 'production_slot', 'meeting', 'deadline', 'leave', 'holiday', 'maintenance', 'payment_due', 'other');--> statement-breakpoint
CREATE TYPE "public"."client_price_tier" AS ENUM('standard', 'preferred', 'wholesale');--> statement-breakpoint
CREATE TYPE "public"."client_source" AS ENUM('walk_in', 'referral', 'meta_ads', 'website', 'facebook', 'other');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('lead', 'prospect', 'active', 'dormant', 'lost');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('scheduled', 'out_for_delivery', 'delivered', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."die_condition" AS ENUM('good', 'worn', 'needs_repair', 'retired');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'resigned', 'terminated', 'awol');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('regular', 'probationary', 'contractual', 'project');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('materials', 'utilities', 'salaries', 'rent', 'maintenance', 'transport', 'marketing', 'supplies', 'other');--> statement-breakpoint
CREATE TYPE "public"."holiday_type" AS ENUM('regular', 'special_non_working');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('call', 'email', 'meeting', 'site_visit', 'messenger');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_order_priority" AS ENUM('normal', 'rush', 'critical');--> statement-breakpoint
CREATE TYPE "public"."job_order_stage" AS ENUM('draft', 'for_artwork', 'artwork_approval', 'prepress', 'materials_ready', 'printing', 'finishing', 'die_cutting', 'gluing_assembly', 'quality_check', 'packing', 'ready_for_delivery', 'delivered', 'invoiced', 'paid', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('vacation', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', 'solo_parent');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('duplex_greyback', 'duplex_whiteback', 'c1s', 'c2s', 'sbs', 'kraft', 'corrugated_e');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'check', 'gcash', 'maya', 'other');--> statement-breakpoint
CREATE TYPE "public"."process_rate_unit" AS ENUM('per_sheet', 'per_piece', 'per_plate', 'per_job', 'per_sqin');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'ordered', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'pending_approval', 'sent', 'revised', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'management', 'sales', 'production', 'accounting', 'hr', 'staff');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"changes" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" text,
	"uploaded_by" uuid,
	"kind" "attachment_kind" DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"mentions" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"head_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"is_manager" boolean DEFAULT false NOT NULL,
	"department" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"company_name" text NOT NULL,
	"trade_name" text,
	"industry" text,
	"tin" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"is_vat_registered" boolean DEFAULT false NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"credit_limit_centavos" bigint DEFAULT 0 NOT NULL,
	"price_tier" "client_price_tier" DEFAULT 'standard' NOT NULL,
	"owner_user_id" uuid,
	"source" "client_source" DEFAULT 'other' NOT NULL,
	"status" "client_status" DEFAULT 'prospect' NOT NULL,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"email" text,
	"mobile" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"client_id" uuid,
	"lead_id" uuid,
	"user_id" uuid NOT NULL,
	"type" "interaction_type" NOT NULL,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_action" text,
	"next_action_date" date,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"company" text,
	"contact" text,
	"source" "client_source" DEFAULT 'other' NOT NULL,
	"inquiry_summary" text,
	"assigned_to" uuid,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"lost_reason" text,
	"converted_client_id" uuid,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "box_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"client_id" uuid,
	"name" text NOT NULL,
	"style" "box_style" NOT NULL,
	"length_mm" numeric(8, 2) NOT NULL,
	"width_mm" numeric(8, 2) NOT NULL,
	"height_mm" numeric(8, 2) NOT NULL,
	"material_id" uuid,
	"gsm" integer,
	"print_colours_front" integer DEFAULT 0 NOT NULL,
	"print_colours_back" integer DEFAULT 0 NOT NULL,
	"has_spot_colour" boolean DEFAULT false NOT NULL,
	"spot_colour_notes" text,
	"finishing" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_food_grade" boolean DEFAULT false NOT NULL,
	"dieline_attachment_id" uuid,
	"ups_per_sheet" integer DEFAULT 1 NOT NULL,
	"die_id" uuid,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "dies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"box_spec_id" uuid NOT NULL,
	"storage_code" text,
	"cost_centavos" bigint DEFAULT 0 NOT NULL,
	"created_date" date NOT NULL,
	"times_used" integer DEFAULT 0 NOT NULL,
	"condition" "die_condition" DEFAULT 'good' NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"type" "material_type" NOT NULL,
	"gsm" integer NOT NULL,
	"sheet_width_in" numeric(6, 2) NOT NULL,
	"sheet_length_in" numeric(6, 2) NOT NULL,
	"cost_per_sheet_centavos" bigint NOT NULL,
	"supplier" text,
	"is_food_grade" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"min_order_sheets" integer DEFAULT 0 NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "process_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"unit" "process_rate_unit" NOT NULL,
	"rate_centavos" bigint NOT NULL,
	"setup_fee_centavos" bigint DEFAULT 0 NOT NULL,
	"setup_sheets" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	CONSTRAINT "process_rates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"quotation_id" uuid NOT NULL,
	"box_spec_id" uuid,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost_breakdown" jsonb NOT NULL,
	"unit_price_centavos" bigint NOT NULL,
	"line_total_centavos" bigint NOT NULL,
	"lead_time_days" integer,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "quotation_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"quotation_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_centavos" bigint NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"quote_number" text NOT NULL,
	"client_id" uuid,
	"lead_id" uuid,
	"prepared_by" uuid NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"valid_until" timestamp with time zone,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"subtotal_centavos" bigint DEFAULT 0 NOT NULL,
	"vat_centavos" bigint DEFAULT 0 NOT NULL,
	"total_centavos" bigint DEFAULT 0 NOT NULL,
	"markup_pct_bps" integer DEFAULT 3500 NOT NULL,
	"notes" text,
	"terms" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"rejected_reason" text,
	"revision_of_quotation_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	CONSTRAINT "quotations_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"job_order_id" uuid NOT NULL,
	"dr_number" text NOT NULL,
	"scheduled_date" date,
	"delivered_at" timestamp with time zone,
	"quantity" integer NOT NULL,
	"received_by_name" text,
	"driver_name" text,
	"vehicle" text,
	"proof_photo_attachment_id" uuid,
	"status" "delivery_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid,
	CONSTRAINT "deliveries_dr_number_unique" UNIQUE("dr_number")
);
--> statement-breakpoint
CREATE TABLE "jo_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"job_order_id" uuid NOT NULL,
	"stage" "job_order_stage" NOT NULL,
	"item_label" text NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"done_by" uuid,
	"done_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "jo_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"job_order_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"sheets_planned" integer DEFAULT 0 NOT NULL,
	"sheets_issued" integer DEFAULT 0 NOT NULL,
	"sheets_used" integer DEFAULT 0 NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "jo_production_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"job_order_id" uuid NOT NULL,
	"stage" "job_order_stage" NOT NULL,
	"operator_id" uuid,
	"machine" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"good_output" integer DEFAULT 0 NOT NULL,
	"waste_count" integer DEFAULT 0 NOT NULL,
	"waste_reason" text,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "jo_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"from_stage" "job_order_stage",
	"to_stage" "job_order_stage" NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"note" text,
	"is_rework" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"jo_number" text NOT NULL,
	"client_id" uuid NOT NULL,
	"quotation_id" uuid,
	"client_po_number" text,
	"po_attachment_id" uuid,
	"box_spec_id" uuid,
	"quantity_ordered" integer NOT NULL,
	"quantity_produced" integer DEFAULT 0 NOT NULL,
	"quantity_delivered" integer DEFAULT 0 NOT NULL,
	"unit_price_centavos" bigint NOT NULL,
	"total_centavos" bigint NOT NULL,
	"stage" "job_order_stage" DEFAULT 'draft' NOT NULL,
	"priority" "job_order_priority" DEFAULT 'normal' NOT NULL,
	"order_date" date NOT NULL,
	"target_delivery_date" date,
	"actual_delivery_date" date,
	"is_repeat_order" boolean DEFAULT false NOT NULL,
	"previous_jo_id" uuid,
	"sales_owner_id" uuid,
	"production_owner_id" uuid,
	"is_on_hold" boolean DEFAULT false NOT NULL,
	"hold_reason" text,
	"cancelled_reason" text,
	"notes" text,
	"created_by" uuid,
	CONSTRAINT "job_orders_jo_number_unique" UNIQUE("jo_number")
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"event_type" "calendar_event_type" DEFAULT 'other' NOT NULL,
	"department" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"location" text,
	"attendees" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"colour" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"department" text,
	"assignee_id" uuid,
	"watchers" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"priority" "task_priority" DEFAULT 'normal' NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"blocked_reason" text,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recurrence_rule" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"time_in" time,
	"time_out" time,
	"hours_worked" numeric(5, 2),
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" uuid,
	"employee_no" text NOT NULL,
	"full_name" text NOT NULL,
	"position" text,
	"department" text,
	"employment_type" "employment_type" DEFAULT 'probationary' NOT NULL,
	"date_hired" date NOT NULL,
	"date_regularized" date,
	"daily_rate_centavos" bigint,
	"monthly_rate_centavos" bigint,
	"sss_no" text,
	"philhealth_no" text,
	"pagibig_no" text,
	"tin" text,
	"emergency_contact" text,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	CONSTRAINT "employees_employee_no_unique" UNIQUE("employee_no")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"type" "holiday_type" DEFAULT 'regular' NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"entitled_days" numeric(5, 2) NOT NULL,
	"used_days" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"employee_id" uuid NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" numeric(5, 2) NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"category" "expense_category" NOT NULL,
	"vendor" text,
	"description" text NOT NULL,
	"amount_centavos" bigint NOT NULL,
	"expense_date" date NOT NULL,
	"job_order_id" uuid,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"receipt_attachment_id" uuid,
	"recorded_by" uuid NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"invoice_number" text NOT NULL,
	"job_order_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"subtotal_centavos" bigint NOT NULL,
	"vat_centavos" bigint DEFAULT 0 NOT NULL,
	"withholding_tax_centavos" bigint DEFAULT 0 NOT NULL,
	"total_centavos" bigint NOT NULL,
	"amount_paid_centavos" bigint DEFAULT 0 NOT NULL,
	"balance_centavos" bigint NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"invoice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"amount_centavos" bigint NOT NULL,
	"payment_date" date NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference_no" text,
	"check_date" date,
	"received_by" uuid,
	"attachment_id" uuid,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"supplier" text NOT NULL,
	"po_number" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_centavos" bigint DEFAULT 0 NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"expected_date" date,
	"received_date" date,
	"job_order_id" uuid,
	"created_by" uuid,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "ad_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"month" date NOT NULL,
	"platform" text DEFAULT 'meta' NOT NULL,
	"campaign_name" text,
	"spend_centavos" bigint NOT NULL,
	"leads_generated" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_users_id_fk" FOREIGN KEY ("head_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_specs" ADD CONSTRAINT "box_specs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_specs" ADD CONSTRAINT "box_specs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_specs" ADD CONSTRAINT "box_specs_dieline_attachment_id_attachments_id_fk" FOREIGN KEY ("dieline_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_specs" ADD CONSTRAINT "box_specs_die_id_dies_id_fk" FOREIGN KEY ("die_id") REFERENCES "public"."dies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_specs" ADD CONSTRAINT "box_specs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dies" ADD CONSTRAINT "dies_box_spec_id_box_specs_id_fk" FOREIGN KEY ("box_spec_id") REFERENCES "public"."box_specs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dies" ADD CONSTRAINT "dies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_rates" ADD CONSTRAINT "process_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_box_spec_id_box_specs_id_fk" FOREIGN KEY ("box_spec_id") REFERENCES "public"."box_specs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_tiers" ADD CONSTRAINT "quotation_tiers_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_tiers" ADD CONSTRAINT "quotation_tiers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_proof_photo_attachment_id_attachments_id_fk" FOREIGN KEY ("proof_photo_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_checklists" ADD CONSTRAINT "jo_checklists_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_checklists" ADD CONSTRAINT "jo_checklists_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_checklists" ADD CONSTRAINT "jo_checklists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_materials" ADD CONSTRAINT "jo_materials_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_materials" ADD CONSTRAINT "jo_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_materials" ADD CONSTRAINT "jo_materials_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_materials" ADD CONSTRAINT "jo_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_production_logs" ADD CONSTRAINT "jo_production_logs_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_production_logs" ADD CONSTRAINT "jo_production_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_production_logs" ADD CONSTRAINT "jo_production_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_stage_history" ADD CONSTRAINT "jo_stage_history_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jo_stage_history" ADD CONSTRAINT "jo_stage_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_po_attachment_id_attachments_id_fk" FOREIGN KEY ("po_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_box_spec_id_box_specs_id_fk" FOREIGN KEY ("box_spec_id") REFERENCES "public"."box_specs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_previous_jo_id_job_orders_id_fk" FOREIGN KEY ("previous_jo_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_sales_owner_id_users_id_fk" FOREIGN KEY ("sales_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_production_owner_id_users_id_fk" FOREIGN KEY ("production_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_attachment_id_attachments_id_fk" FOREIGN KEY ("receipt_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;