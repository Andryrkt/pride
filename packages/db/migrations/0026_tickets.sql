CREATE TYPE "public"."ticket_kind" AS ENUM('BUG', 'AMELIORATION');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('NOUVEAU', 'EN_COURS', 'RESOLU', 'REFUSE');--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"number" serial NOT NULL,
	"member_id" text NOT NULL,
	"kind" "ticket_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"page" text,
	"user_agent" text,
	"screenshot_key" text,
	"status" "ticket_status" DEFAULT 'NOUVEAU' NOT NULL,
	"admin_note" text,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_member_idx" ON "tickets" USING btree ("member_id");