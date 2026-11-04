CREATE TYPE "ops"."review_decision" AS ENUM('approved', 'changes_requested');--> statement-breakpoint
CREATE TYPE "ops"."suggestion_status" AS ENUM('new', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "ops"."content_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "ops"."review_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."content_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"idea" text NOT NULL,
	"why" text,
	"channel" "ops"."content_channel",
	"reference_url" text,
	"author_id" uuid,
	"status" "ops"."suggestion_status" DEFAULT 'new' NOT NULL,
	"decided_by" uuid,
	"decision_note" text,
	"piece_id" uuid,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ops"."content_reviews" ADD CONSTRAINT "content_reviews_piece_id_content_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "ops"."content_pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_suggestions" ADD CONSTRAINT "content_suggestions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_suggestions" ADD CONSTRAINT "content_suggestions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_suggestions" ADD CONSTRAINT "content_suggestions_piece_id_content_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "ops"."content_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."content_suggestions" ADD CONSTRAINT "content_suggestions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "ops"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_reviews_piece_reviewer_unique" ON "ops"."content_reviews" USING btree ("piece_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "content_suggestions_status_idx" ON "ops"."content_suggestions" USING btree ("status");