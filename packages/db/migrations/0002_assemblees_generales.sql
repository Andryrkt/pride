CREATE TYPE "public"."assembly_kind" AS ENUM('ORDINAIRE', 'EXTRAORDINAIRE');--> statement-breakpoint
CREATE TYPE "public"."assembly_status" AS ENUM('PREPARATION', 'CONVOQUEE', 'EN_SEANCE', 'CLOTUREE', 'CARENCE');--> statement-breakpoint
CREATE TYPE "public"."majority" AS ENUM('SIMPLE', 'ABSOLUE', 'DEUX_TIERS');--> statement-breakpoint
CREATE TABLE "assemblies" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"reference" text NOT NULL,
	"kind" "assembly_kind" DEFAULT 'ORDINAIRE' NOT NULL,
	"title" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"agenda" text NOT NULL,
	"status" "assembly_status" DEFAULT 'PREPARATION' NOT NULL,
	"convocation_number" integer DEFAULT 1 NOT NULL,
	"previous_id" text,
	"convoked_at" timestamp with time zone,
	"convocations_sent" integer,
	"opened_at" timestamp with time zone,
	"eligible_voters" integer,
	"quorum" integer,
	"president_id" text,
	"secretary_id" text,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assemblies_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "assembly_attendances" (
	"assembly_id" text NOT NULL,
	"member_id" text NOT NULL,
	"can_vote" boolean NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assembly_attendances_assembly_id_member_id_pk" PRIMARY KEY("assembly_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "resolutions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"assembly_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"majority" "majority" DEFAULT 'SIMPLE' NOT NULL,
	"voters" integer,
	"votes_for" integer,
	"votes_against" integer,
	"abstentions" integer,
	"adopted" boolean,
	"voted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_president_id_members_id_fk" FOREIGN KEY ("president_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_secretary_id_members_id_fk" FOREIGN KEY ("secretary_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_attendances" ADD CONSTRAINT "assembly_attendances_assembly_id_assemblies_id_fk" FOREIGN KEY ("assembly_id") REFERENCES "public"."assemblies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_attendances" ADD CONSTRAINT "assembly_attendances_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_assembly_id_assemblies_id_fk" FOREIGN KEY ("assembly_id") REFERENCES "public"."assemblies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assemblies_scheduled_idx" ON "assemblies" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resolutions_position_uq" ON "resolutions" USING btree ("assembly_id","position");--> statement-breakpoint
-- Une AG clôturée (ou constatée en carence) fait foi : son procès-verbal, ses votes et sa liste
-- d'émargement ne peuvent plus être modifiés ni supprimés.
CREATE OR REPLACE FUNCTION pride_ag_verrouillee() RETURNS trigger AS $$
DECLARE
  ag_id text;
  ag_status assembly_status;
BEGIN
  IF TG_TABLE_NAME = 'assemblies' THEN
    ag_status := OLD.status;
  ELSE
    ag_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.assembly_id ELSE NEW.assembly_id END;
    SELECT status INTO ag_status FROM assemblies WHERE id = ag_id;
  END IF;
  IF ag_status IN ('CLOTUREE', 'CARENCE') THEN
    RAISE EXCEPTION 'Assemblée générale clôturée : le procès-verbal, les votes et l''émargement ne peuvent plus être modifiés.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER assemblies_verrouillees
  BEFORE UPDATE OR DELETE ON assemblies
  FOR EACH ROW EXECUTE FUNCTION pride_ag_verrouillee();
--> statement-breakpoint
CREATE TRIGGER resolutions_verrouillees
  BEFORE INSERT OR UPDATE OR DELETE ON resolutions
  FOR EACH ROW EXECUTE FUNCTION pride_ag_verrouillee();
--> statement-breakpoint
CREATE TRIGGER assembly_attendances_verrouillees
  BEFORE INSERT OR UPDATE OR DELETE ON assembly_attendances
  FOR EACH ROW EXECUTE FUNCTION pride_ag_verrouillee();
