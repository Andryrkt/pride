-- Consultations en ligne : vote anonyme, un vote par membre (votants et bulletins séparés).
CREATE TABLE "consultation_ballots" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"consultation_id" text NOT NULL,
	"option" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_voters" (
	"consultation_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "consultation_voters_consultation_id_member_id_pk" PRIMARY KEY("consultation_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"question" text NOT NULL,
	"options" text[] NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consultation_ballots" ADD CONSTRAINT "consultation_ballots_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_voters" ADD CONSTRAINT "consultation_voters_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_voters" ADD CONSTRAINT "consultation_voters_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_ballots_idx" ON "consultation_ballots" USING btree ("consultation_id");