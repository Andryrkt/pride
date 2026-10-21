-- Aide de solidarité (RI art. 6) : déclarations des membres et décisions des dirigeants.
CREATE TYPE "public"."solidarity_concerns" AS ENUM('MEMBRE', 'FAMILLE');--> statement-breakpoint
CREATE TYPE "public"."solidarity_kind" AS ENUM('MARIAGE', 'NAISSANCE', 'MALADIE', 'DECES');--> statement-breakpoint
CREATE TYPE "public"."solidarity_status" AS ENUM('DEMANDEE', 'ACCORDEE', 'REFUSEE');--> statement-breakpoint
CREATE TABLE "solidarity_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"kind" "solidarity_kind" NOT NULL,
	"concerns" "solidarity_concerns" NOT NULL,
	"event_date" date NOT NULL,
	"message" text,
	"amount" integer NOT NULL,
	"status" "solidarity_status" DEFAULT 'DEMANDEE' NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solidarity_requests" ADD CONSTRAINT "solidarity_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "solidarity_requests_uq" ON "solidarity_requests" USING btree ("member_id","kind","concerns","event_date");--> statement-breakpoint
CREATE INDEX "solidarity_requests_status_idx" ON "solidarity_requests" USING btree ("status");