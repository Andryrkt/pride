CREATE TYPE "public"."proposal_kind" AS ENUM('ATELIER', 'PROJET');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('RECUE', 'RETENUE', 'NON_RETENUE');--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"kind" "proposal_kind" NOT NULL,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"status" "proposal_status" DEFAULT 'RECUE' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposals_member_idx" ON "proposals" USING btree ("member_id");--> statement-breakpoint
-- Reprise des propositions déjà envoyées (gardées jusqu'ici dans contact_messages, nom = « Prénoms Nom (numéro) »).
INSERT INTO "proposals" ("member_id", "kind", "title", "details", "created_at")
SELECT m."id",
	CASE WHEN c."subject" LIKE 'Proposition d''atelier : %' THEN 'ATELIER'::"proposal_kind" ELSE 'PROJET'::"proposal_kind" END,
	substring(c."subject" from position(' : ' in c."subject") + 3),
	c."message",
	c."created_at"
FROM "contact_messages" c
JOIN "members" m ON c."name" LIKE '%(' || m."number" || ')'
WHERE c."subject" LIKE 'Proposition d''atelier : %' OR c."subject" LIKE 'Idée de projet : %';
