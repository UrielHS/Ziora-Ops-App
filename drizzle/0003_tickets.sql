CREATE TYPE "ops"."effort" AS ENUM('s', 'm', 'l', 'xl');--> statement-breakpoint
CREATE TYPE "ops"."ticket_kind" AS ENUM('bug', 'change', 'feature');--> statement-breakpoint
CREATE TYPE "ops"."ticket_origin" AS ENUM('team', 'ziora_app_help');--> statement-breakpoint
CREATE TYPE "ops"."ticket_status" AS ENUM('new', 'evaluating', 'planned', 'in_progress', 'done', 'rejected');--> statement-breakpoint
CREATE TYPE "ops"."viability" AS ENUM('pending', 'viable', 'not_viable', 'needs_info');--> statement-breakpoint
CREATE TABLE "ops"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"kind" "ops"."ticket_kind" DEFAULT 'change' NOT NULL,
	"origin" "ops"."ticket_origin" DEFAULT 'team' NOT NULL,
	"title" text NOT NULL,
	"as_a" text,
	"i_want" text,
	"so_that" text,
	"acceptance_criteria" text[] DEFAULT '{}'::text[] NOT NULL,
	"context" text,
	"area" text,
	"category" text,
	"impact" integer,
	"effort" "ops"."effort",
	"viability" "ops"."viability" DEFAULT 'pending' NOT NULL,
	"decision_note" text,
	"status" "ops"."ticket_status" DEFAULT 'new' NOT NULL,
	"reporter_id" uuid,
	"reporter_email" text,
	"assignee_id" uuid,
	"external_id" text,
	"app_version" text,
	"page_url" text,
	"bug_id" uuid,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "ops"."tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tickets" ADD CONSTRAINT "tickets_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "ops"."bugs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tickets" ADD CONSTRAINT "tickets_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "ops"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "ops"."tickets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_origin_external_unique" ON "ops"."tickets" USING btree ("origin","external_id") WHERE "ops"."tickets"."external_id" is not null;