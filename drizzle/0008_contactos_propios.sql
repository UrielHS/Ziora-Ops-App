CREATE TYPE "ops"."city" AS ENUM('cdmx', 'nyc', 'gdl', 'mty', 'other', 'tbd');--> statement-breakpoint
CREATE TYPE "ops"."contact_source" AS ENUM('manual', 'demo_form', 'ziora_app', 'sheet_import', 'csv_import', 'event_ops', 'facebook_group', 'instagram', 'linkedin', 'referral');--> statement-breakpoint
CREATE TYPE "ops"."contact_tag" AS ENUM('psychologist', 'lead', 'clinic', 'ziora_user', 'sponsor', 'speaker', 'founder', 'angel', 'vc', 'community_partner', 'influencer', 'hospital', 'university', 'attendee', 'vendor');--> statement-breakpoint
CREATE TABLE "ops"."contact_tags" (
	"contact_id" uuid NOT NULL,
	"tag" "ops"."contact_tag" NOT NULL,
	CONSTRAINT "contact_tags_contact_id_tag_pk" PRIMARY KEY("contact_id","tag")
);
--> statement-breakpoint
CREATE TABLE "ops"."contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"job_title" text,
	"city" "ops"."city",
	"linkedin_url" text,
	"website" text,
	"source" "ops"."contact_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_ops_contact_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ops"."account_contacts" DROP CONSTRAINT "account_contacts_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "ops"."campaign_sends" DROP CONSTRAINT "campaign_sends_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "ops"."contact_consents" DROP CONSTRAINT "contact_consents_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "ops"."demo_requests" DROP CONSTRAINT "demo_requests_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "ops"."tasks" DROP CONSTRAINT "tasks_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "ops"."contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_unique" ON "ops"."contacts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_event_ops_unique" ON "ops"."contacts" USING btree ("event_ops_contact_id");--> statement-breakpoint
CREATE INDEX "contacts_name_idx" ON "ops"."contacts" USING btree ("name");--> statement-breakpoint
-- Los contactos de Event Ops que ya usaba Ziora Ops (demos, consentimientos, cuentas, envíos, tareas) se copian
-- a ops.contacts con el MISMO id, para que esos registros sigan ligados a su persona. En producción eran 10 demos (nov-2026).
INSERT INTO "ops"."contacts" ("id", "name", "email", "phone", "city", "source", "notes", "details", "created_at", "updated_at")
SELECT c."id", c."name", lower(c."email"), c."phone",
  CASE WHEN c."city"::text IN ('cdmx', 'nyc', 'gdl', 'mty', 'other', 'tbd') THEN c."city"::text::"ops"."city" END,
  CASE WHEN c."source"::text IN ('manual', 'demo_form', 'ziora_app', 'csv_import', 'facebook_group', 'instagram', 'linkedin')
    THEN c."source"::text::"ops"."contact_source" ELSE 'manual'::"ops"."contact_source" END,
  c."notes", c."details", c."created_at", c."updated_at"
FROM "public"."contacts" c
WHERE c."id" IN (
  SELECT "contact_id" FROM "ops"."demo_requests" WHERE "contact_id" IS NOT NULL
  UNION SELECT "contact_id" FROM "ops"."contact_consents"
  UNION SELECT "contact_id" FROM "ops"."account_contacts"
  UNION SELECT "contact_id" FROM "ops"."campaign_sends" WHERE "contact_id" IS NOT NULL
  UNION SELECT "contact_id" FROM "ops"."tasks" WHERE "contact_id" IS NOT NULL
)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "ops"."contact_tags" ("contact_id", "tag")
SELECT t."contact_id", t."tag"::text::"ops"."contact_tag"
FROM "public"."contact_tags" t
WHERE t."contact_id" IN (SELECT "id" FROM "ops"."contacts")
  AND t."tag"::text IN ('psychologist', 'lead', 'clinic', 'ziora_user', 'sponsor', 'speaker', 'founder', 'angel', 'vc',
    'community_partner', 'influencer', 'hospital', 'university', 'attendee', 'vendor')
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Los registros que apuntaban a contactos de Event Ops (public.contacts) se desligan antes de las llaves nuevas.
-- En producción no había ninguno (nov-2026); esto protege bases de desarrollo con datos de ejemplo.
UPDATE "ops"."tasks" SET "contact_id" = NULL WHERE "contact_id" IS NOT NULL AND "contact_id" NOT IN (SELECT "id" FROM "ops"."contacts");--> statement-breakpoint
UPDATE "ops"."demo_requests" SET "contact_id" = NULL WHERE "contact_id" IS NOT NULL AND "contact_id" NOT IN (SELECT "id" FROM "ops"."contacts");--> statement-breakpoint
UPDATE "ops"."campaign_sends" SET "contact_id" = NULL WHERE "contact_id" IS NOT NULL AND "contact_id" NOT IN (SELECT "id" FROM "ops"."contacts");--> statement-breakpoint
DELETE FROM "ops"."contact_consents" WHERE "contact_id" NOT IN (SELECT "id" FROM "ops"."contacts");--> statement-breakpoint
DELETE FROM "ops"."account_contacts" WHERE "contact_id" NOT IN (SELECT "id" FROM "ops"."contacts");--> statement-breakpoint
ALTER TABLE "ops"."account_contacts" ADD CONSTRAINT "account_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."campaign_sends" ADD CONSTRAINT "campaign_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."contact_consents" ADD CONSTRAINT "contact_consents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."demo_requests" ADD CONSTRAINT "demo_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "ops"."contacts"("id") ON DELETE set null ON UPDATE no action;