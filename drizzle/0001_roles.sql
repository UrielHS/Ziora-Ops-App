CREATE TYPE "ops"."ops_role" AS ENUM('ceo', 'sales', 'clinical_director', 'marketing', 'operations', 'dev_qa');--> statement-breakpoint
CREATE TABLE "ops"."member_roles" (
	"user_id" uuid NOT NULL,
	"role" "ops"."ops_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "ops"."member_roles" ADD CONSTRAINT "member_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;