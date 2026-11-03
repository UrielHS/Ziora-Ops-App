CREATE TYPE "ops"."account_type" AS ENUM('clinic', 'university', 'hospital', 'institution', 'other');--> statement-breakpoint
CREATE TYPE "ops"."billing_period" AS ENUM('monthly', 'annual', 'one_time');--> statement-breakpoint
CREATE TYPE "ops"."contract_status" AS ENUM('draft', 'sent', 'signed', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "ops"."deal_stage" AS ENUM('prospect', 'meeting', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "ops"."account_contacts" (
	"account_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"title" text,
	"decision_maker" boolean DEFAULT false NOT NULL,
	CONSTRAINT "account_contacts_account_id_contact_id_pk" PRIMARY KEY("account_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "ops"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "ops"."account_type" DEFAULT 'clinic' NOT NULL,
	"city" text,
	"website" text,
	"organization_id" uuid,
	"owner_id" uuid,
	"therapists_count" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"account_id" uuid NOT NULL,
	"deal_id" uuid,
	"title" text NOT NULL,
	"seats" integer,
	"price_per_seat_mxn" integer,
	"amount_mxn" integer DEFAULT 0 NOT NULL,
	"billing_period" "ops"."billing_period" DEFAULT 'monthly' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"status" "ops"."contract_status" DEFAULT 'draft' NOT NULL,
	"signed_on" date,
	"document_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "ops"."deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stage" "ops"."deal_stage" DEFAULT 'prospect' NOT NULL,
	"seats" integer,
	"amount_mxn" integer,
	"billing_period" "ops"."billing_period" DEFAULT 'monthly' NOT NULL,
	"expected_close_on" date,
	"owner_id" uuid,
	"lost_reason" text,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ops"."account_contacts" ADD CONSTRAINT "account_contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."account_contacts" ADD CONSTRAINT "account_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."accounts" ADD CONSTRAINT "accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."contracts" ADD CONSTRAINT "contracts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."contracts" ADD CONSTRAINT "contracts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "ops"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."deals" ADD CONSTRAINT "deals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "ops"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "ops"."contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_ends_on_idx" ON "ops"."contracts" USING btree ("ends_on");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "ops"."deals" USING btree ("stage");