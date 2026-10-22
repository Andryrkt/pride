-- Formations (type de publication), offres, annuaire des compétences, demandes d'entrée en commission.
CREATE TYPE "public"."commission_request_status" AS ENUM('DEMANDEE', 'ACCEPTEE', 'REFUSEE');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('PROPOSEE', 'PUBLIEE', 'REFUSEE', 'CLOTUREE');--> statement-breakpoint
CREATE TYPE "public"."offer_type" AS ENUM('STAGE', 'EMPLOI', 'BENEVOLAT');--> statement-breakpoint
ALTER TYPE "public"."post_type" ADD VALUE 'FORMATION';--> statement-breakpoint
CREATE TABLE "commission_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"commission_id" text NOT NULL,
	"status" "commission_request_status" DEFAULT 'DEMANDEE' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_requests" (
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_requests_from_id_to_id_pk" PRIMARY KEY("from_id","to_id")
);
--> statement-breakpoint
CREATE TABLE "offer_interests" (
	"offer_id" text NOT NULL,
	"member_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_interests_offer_id_member_id_pk" PRIMARY KEY("offer_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"author_id" text NOT NULL,
	"type" "offer_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"status" "offer_status" DEFAULT 'PROPOSEE' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "share_skills" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "commission_requests" ADD CONSTRAINT "commission_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_requests" ADD CONSTRAINT "commission_requests_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_from_id_members_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_to_id_members_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_interests" ADD CONSTRAINT "offer_interests_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_interests" ADD CONSTRAINT "offer_interests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commission_requests_pending_uq" ON "commission_requests" USING btree ("member_id","commission_id") WHERE status = 'DEMANDEE';--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");