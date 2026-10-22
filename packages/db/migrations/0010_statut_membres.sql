-- Fin de la qualité de membre (démission, décès) et procédure d'exclusion (RI, art. 2).
CREATE TYPE "public"."exclusion_status" AS ENUM('OUVERTE', 'ADOPTEE', 'REJETEE');--> statement-breakpoint
CREATE TABLE "exclusion_procedures" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"reason" text NOT NULL,
	"hearing_at" timestamp with time zone NOT NULL,
	"status" "exclusion_status" DEFAULT 'OUVERTE' NOT NULL,
	"defense" text,
	"meeting_date" date,
	"presents" integer,
	"votes_for" integer,
	"votes_against" integer,
	"opened_by" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "status_changed_at" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "status_note" text;--> statement-breakpoint
ALTER TABLE "exclusion_procedures" ADD CONSTRAINT "exclusion_procedures_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exclusion_procedures_open_uq" ON "exclusion_procedures" USING btree ("member_id") WHERE status = 'OUVERTE';