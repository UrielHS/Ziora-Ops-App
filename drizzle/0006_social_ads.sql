CREATE TYPE "ops"."social_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'linkedin');--> statement-breakpoint
CREATE TABLE "ops"."ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "ops"."social_platform" NOT NULL,
	"external_id" text NOT NULL,
	"account_id" uuid,
	"name" text NOT NULL,
	"objective" text,
	"status" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."ad_daily" (
	"campaign_id" uuid NOT NULL,
	"day" date NOT NULL,
	"spend_cents" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ad_daily_campaign_id_day_pk" PRIMARY KEY("campaign_id","day")
);
--> statement-breakpoint
CREATE TABLE "ops"."social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "ops"."social_platform" NOT NULL,
	"handle" text NOT NULL,
	"external_id" text,
	"ad_account_id" text,
	"token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."social_daily" (
	"account_id" uuid NOT NULL,
	"day" date NOT NULL,
	"followers" integer,
	"reach" integer,
	"impressions" integer,
	"engagements" integer,
	"profile_views" integer,
	"link_clicks" integer,
	CONSTRAINT "social_daily_account_id_day_pk" PRIMARY KEY("account_id","day")
);
--> statement-breakpoint
CREATE TABLE "ops"."social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"caption" text,
	"media_type" text,
	"published_at" timestamp with time zone,
	"reach" integer,
	"views" integer,
	"likes" integer,
	"comments" integer,
	"shares" integer,
	"saves" integer,
	"content_piece_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ops"."ad_campaigns" ADD CONSTRAINT "ad_campaigns_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."social_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."ad_daily" ADD CONSTRAINT "ad_daily_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "ops"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."social_daily" ADD CONSTRAINT "social_daily_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."social_posts" ADD CONSTRAINT "social_posts_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."social_posts" ADD CONSTRAINT "social_posts_content_piece_id_content_pieces_id_fk" FOREIGN KEY ("content_piece_id") REFERENCES "ops"."content_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_campaigns_platform_external_unique" ON "ops"."ad_campaigns" USING btree ("platform","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_platform_handle_unique" ON "ops"."social_accounts" USING btree ("platform","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_account_external_unique" ON "ops"."social_posts" USING btree ("account_id","external_id");