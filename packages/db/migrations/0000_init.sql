CREATE TYPE "public"."application_status" AS ENUM('SOUMISE', 'ENTRETIEN', 'VOTE_CA', 'AGREEE', 'REFUSEE', 'MEMBRE');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('RESIDENCE', 'CIN', 'ACTE_NAISSANCE', 'CV', 'LETTRE');--> statement-breakpoint
CREATE TYPE "public"."due_kind" AS ENUM('DROIT_ENTREE', 'COTISATION');--> statement-breakpoint
CREATE TYPE "public"."due_status" AS ENUM('A_PAYER', 'PAYEE');--> statement-breakpoint
CREATE TYPE "public"."ledger_direction" AS ENUM('RECETTE', 'DEPENSE');--> statement-breakpoint
CREATE TYPE "public"."mandate_role" AS ENUM('PRESIDENT', 'VICE_PRESIDENT', 'CONSEILLER', 'COORDONNATEUR', 'SECRETAIRE_GENERALE', 'TRESORIER', 'RESPONSABLE_COMMISSION', 'RESPONSABLE_SECTION', 'ADMIN_TECHNIQUE');--> statement-breakpoint
CREATE TYPE "public"."member_category" AS ENUM('ACTIF', 'ACTIF_MINEUR', 'BIENFAITEUR');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('ACTIF', 'DEMISSIONNAIRE', 'EXCLU', 'DECEDE');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'ESPECES');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('EN_ATTENTE', 'REUSSI', 'ECHOUE');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('ARTICLE', 'EVENEMENT', 'ANNONCE');--> statement-breakpoint
CREATE TYPE "public"."sponsorship" AS ENUM('PARRAIN', 'ENTRETIEN');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('PUBLIC', 'MEMBRES');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"application_id" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"reference" text NOT NULL,
	"status" "application_status" DEFAULT 'SOUMISE' NOT NULL,
	"last_name" text NOT NULL,
	"first_names" text NOT NULL,
	"birth_date" date NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"profession" text,
	"skills" text,
	"expectations" text,
	"category" "member_category" NOT NULL,
	"sponsorship" "sponsorship" NOT NULL,
	"sponsor_id" text,
	"interview_at" timestamp with time zone,
	"parent_name" text,
	"parent_member_number" text,
	"meeting_date" date,
	"presents" integer,
	"votes_for" integer,
	"votes_against" integer,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"notes" text,
	"member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_reference_unique" UNIQUE("reference"),
	CONSTRAINT "applications_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_memberships" (
	"member_id" text NOT NULL,
	"commission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_memberships_member_id_commission_id_pk" PRIMARY KEY("member_id","commission_id")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"kind" "due_kind" NOT NULL,
	"period" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "due_status" DEFAULT 'A_PAYER' NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"post_id" text NOT NULL,
	"member_id" text,
	"name" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"number" serial NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"label" text NOT NULL,
	"direction" "ledger_direction" NOT NULL,
	"amount" integer NOT NULL,
	"piece_ref" text,
	"payment_id" text,
	"corrects_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_number_unique" UNIQUE("number"),
	CONSTRAINT "ledger_entries_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"role" "mandate_role" NOT NULL,
	"starts_at" date NOT NULL,
	"ends_at" date,
	"commission_id" text,
	"section_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"number" text NOT NULL,
	"user_id" text,
	"last_name" text NOT NULL,
	"first_names" text NOT NULL,
	"birth_date" date,
	"phone" text,
	"email" text,
	"address" text,
	"profession" text,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"category" "member_category" DEFAULT 'ACTIF' NOT NULL,
	"status" "member_status" DEFAULT 'ACTIF' NOT NULL,
	"joined_at" date DEFAULT now() NOT NULL,
	"is_founder" boolean DEFAULT false NOT NULL,
	"parent_id" text,
	"sponsor_id" text,
	"section_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_number_unique" UNIQUE("number"),
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"amount" integer NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"phone" text,
	"status" "payment_status" DEFAULT 'EN_ATTENTE' NOT NULL,
	"provider_ref" text,
	"receipt_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"type" "post_type" NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"visibility" "visibility" DEFAULT 'PUBLIC' NOT NULL,
	"event_at" timestamp with time zone,
	"location" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" text,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"opened_at" date DEFAULT now() NOT NULL,
	"closed_at" date,
	CONSTRAINT "sections_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_sponsor_id_members_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_memberships" ADD CONSTRAINT "commission_memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_memberships" ADD CONSTRAINT "commission_memberships_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues" ADD CONSTRAINT "dues_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues" ADD CONSTRAINT "dues_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_documents_kind_uq" ON "application_documents" USING btree ("application_id","kind");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "dues_member_kind_period_uq" ON "dues" USING btree ("member_id","kind","period");--> statement-breakpoint
CREATE INDEX "dues_status_idx" ON "dues" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "event_registrations_member_uq" ON "event_registrations" USING btree ("post_id","member_id");--> statement-breakpoint
CREATE INDEX "mandates_member_idx" ON "mandates" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "members_last_name_idx" ON "members" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "posts_visibility_published_idx" ON "posts" USING btree ("visibility","published_at");