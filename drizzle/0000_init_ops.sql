-- El migrador crea "ops" antes (ahí guarda su tabla de control), por eso IF NOT EXISTS.
CREATE SCHEMA IF NOT EXISTS "ops";
--> statement-breakpoint
CREATE TYPE "ops"."bug_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "ops"."bug_source" AS ENUM('manual', 'ziora_app', 'sentry', 'github');--> statement-breakpoint
CREATE TYPE "ops"."bug_status" AS ENUM('new', 'triaged', 'in_progress', 'fixed', 'verified', 'wont_fix', 'duplicate');--> statement-breakpoint
CREATE TYPE "ops"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "ops"."content_channel" AS ENUM('instagram', 'tiktok', 'facebook_group', 'linkedin', 'blog', 'email');--> statement-breakpoint
CREATE TYPE "ops"."content_pillar" AS ENUM('producto', 'ia_psicoterapia', 'estudios', 'roi', 'psicoterapia_moderna', 'memes');--> statement-breakpoint
CREATE TYPE "ops"."content_status" AS ENUM('idea', 'draft', 'legal_review', 'approved', 'scheduled', 'published', 'discarded');--> statement-breakpoint
CREATE TYPE "ops"."demo_stage" AS ENUM('requested', 'scheduled', 'done', 'no_show', 'trial', 'paid', 'lost');--> statement-breakpoint
CREATE TYPE "ops"."pr_state" AS ENUM('open', 'closed', 'merged');--> statement-breakpoint
CREATE TYPE "ops"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "ops"."risk" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "ops"."send_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "ops"."sprint_status" AS ENUM('planned', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "ops"."task_status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done');--> statement-breakpoint
CREATE TABLE "ops"."bugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"steps_to_reproduce" text,
	"expected" text,
	"actual" text,
	"severity" "ops"."bug_severity" DEFAULT 'medium' NOT NULL,
	"status" "ops"."bug_status" DEFAULT 'new' NOT NULL,
	"area" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"device" text,
	"app_version" text,
	"page_url" text,
	"source" "ops"."bug_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"external_url" text,
	"reporter_email" text,
	"reporter_id" uuid,
	"assignee_id" uuid,
	"pr_url" text,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bugs_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "ops"."campaign_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid,
	"email" text NOT NULL,
	"status" "ops"."send_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"template_id" uuid NOT NULL,
	"subject" text,
	"from_email" text,
	"segment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_id" uuid,
	"status" "ops"."campaign_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."contact_consents" (
	"contact_id" uuid NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"opt_in" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"evidence" text,
	"opted_in_at" timestamp with time zone,
	"opted_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_consents_contact_id_channel_pk" PRIMARY KEY("contact_id","channel")
);
--> statement-breakpoint
CREATE TABLE "ops"."content_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"pillar" "ops"."content_pillar" NOT NULL,
	"channel" "ops"."content_channel" NOT NULL,
	"format" text NOT NULL,
	"status" "ops"."content_status" DEFAULT 'idea' NOT NULL,
	"risk" "ops"."risk" DEFAULT 'low' NOT NULL,
	"publish_on" date,
	"owner_id" uuid,
	"approved_by" uuid,
	"copy" text,
	"sources" text[] DEFAULT '{}'::text[] NOT NULL,
	"asset_url" text,
	"published_url" text,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legal_checklist_ok" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."demo_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text,
	"patients_per_week" text,
	"teletherapy" text,
	"pain_point" text,
	"stage" "ops"."demo_stage" DEFAULT 'requested' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"trial_started_at" timestamp with time zone,
	"owner_id" uuid,
	"source" text DEFAULT 'ziora-copilot.com/demo' NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_id" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"lost_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"preview_text" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."epics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#507060' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "epics_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ops"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"source" text NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"auto" text,
	"targets" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ops"."pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"state" "ops"."pr_state" NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"review_state" text,
	"checks_state" text,
	"url" text NOT NULL,
	"head_ref" text,
	"base_ref" text,
	"opened_at" timestamp with time zone NOT NULL,
	"gh_updated_at" timestamp with time zone NOT NULL,
	"merged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "ops"."sprint_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "ops"."task_status" DEFAULT 'backlog' NOT NULL,
	"priority" "ops"."priority" DEFAULT 'medium' NOT NULL,
	"epic_id" uuid,
	"sprint_id" uuid,
	"assignee_id" uuid,
	"reporter_id" uuid,
	"due_on" date,
	"estimate" integer,
	"labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"blocker" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"contact_id" uuid,
	"bug_id" uuid,
	"demo_id" uuid,
	"pr_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "ops"."bugs" ADD CONSTRAINT "bugs_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."bugs" ADD CONSTRAINT "bugs_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaign_sends" ADD CONSTRAINT "campaign_sends_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "ops"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaign_sends" ADD CONSTRAINT "campaign_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaigns" ADD CONSTRAINT "campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "ops"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaigns" ADD CONSTRAINT "campaigns_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."contact_consents" ADD CONSTRAINT "contact_consents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_pieces" ADD CONSTRAINT "content_pieces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_pieces" ADD CONSTRAINT "content_pieces_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."demo_requests" ADD CONSTRAINT "demo_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."demo_requests" ADD CONSTRAINT "demo_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_epic_id_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "ops"."epics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "ops"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bugs_status_idx" ON "ops"."bugs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "bugs_source_external_unique" ON "ops"."bugs" USING btree ("source","external_id") WHERE "ops"."bugs"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_sends_unique" ON "ops"."campaign_sends" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_sends_provider_unique" ON "ops"."campaign_sends" USING btree ("provider_message_id") WHERE "ops"."campaign_sends"."provider_message_id" is not null;--> statement-breakpoint
CREATE INDEX "content_pieces_publish_on_idx" ON "ops"."content_pieces" USING btree ("publish_on");--> statement-breakpoint
CREATE INDEX "demo_requests_stage_idx" ON "ops"."demo_requests" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_requests_external_id_unique" ON "ops"."demo_requests" USING btree ("external_id") WHERE "ops"."demo_requests"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "pull_requests_repo_number_unique" ON "ops"."pull_requests" USING btree ("repo","number");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "ops"."tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_sprint_idx" ON "ops"."tasks" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "ops"."tasks" USING btree ("assignee_id");