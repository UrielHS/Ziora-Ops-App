ALTER TABLE "ops"."app_users" ADD COLUMN "billing_period" text;--> statement-breakpoint
ALTER TABLE "ops"."app_users" ADD COLUMN "mrr_cents" integer;--> statement-breakpoint
ALTER TABLE "ops"."app_users" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "ops"."app_users" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ops"."app_users" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;