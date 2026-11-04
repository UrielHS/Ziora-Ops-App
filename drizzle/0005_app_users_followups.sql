CREATE TYPE "ops"."followup_channel" AS ENUM('call', 'whatsapp', 'email', 'video', 'in_person');--> statement-breakpoint
CREATE TYPE "ops"."followup_status" AS ENUM('pending', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "ops"."health" AS ENUM('green', 'yellow', 'red');--> statement-breakpoint
CREATE TABLE "ops"."app_user_daily" (
	"day" date NOT NULL,
	"plan" text NOT NULL,
	"users" integer NOT NULL,
	"active" integer NOT NULL,
	"paying" integer NOT NULL,
	"patients" integer NOT NULL,
	"estimated_mrr_mxn" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_user_daily_day_plan_pk" PRIMARY KEY("day","plan")
);
--> statement-breakpoint
CREATE TABLE "ops"."app_users" (
	"uid" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"signed_up_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"patient_count" integer DEFAULT 0 NOT NULL,
	"sessions_last_30d" integer DEFAULT 0 NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"account_id" uuid,
	"first_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ops"."followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"app_user_uid" text,
	"account_id" uuid,
	"demo_id" uuid,
	"channel" "ops"."followup_channel" DEFAULT 'call' NOT NULL,
	"due_on" date NOT NULL,
	"status" "ops"."followup_status" DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT 'manual' NOT NULL,
	"owner_id" uuid,
	"outcome" text,
	"health" "ops"."health",
	"next_action" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."plan_prices" (
	"plan" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"price_mxn" integer DEFAULT 0 NOT NULL,
	"billing_period" "ops"."billing_period" DEFAULT 'monthly' NOT NULL,
	"paying" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ops"."app_users" ADD CONSTRAINT "app_users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."followups" ADD CONSTRAINT "followups_app_user_uid_app_users_uid_fk" FOREIGN KEY ("app_user_uid") REFERENCES "ops"."app_users"("uid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."followups" ADD CONSTRAINT "followups_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."followups" ADD CONSTRAINT "followups_demo_id_demo_requests_id_fk" FOREIGN KEY ("demo_id") REFERENCES "ops"."demo_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."followups" ADD CONSTRAINT "followups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_users_plan_idx" ON "ops"."app_users" USING btree ("plan");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "ops"."app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "followups_status_due_idx" ON "ops"."followups" USING btree ("status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "followups_auto_unique" ON "ops"."followups" USING btree ("app_user_uid","reason") WHERE "ops"."followups"."status" = 'pending' and "ops"."followups"."reason" <> 'manual';