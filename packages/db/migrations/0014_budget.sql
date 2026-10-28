-- Budget annuel : versions (brouillon, adopté par le CA, remplacé par un rectificatif), lignes par compte et par commission, imputation des dépenses.
CREATE TYPE "public"."budget_status" AS ENUM('BROUILLON', 'ADOPTE', 'REMPLACE');--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"budget_id" text NOT NULL,
	"account" text NOT NULL,
	"commission_id" text,
	"label" text,
	"amount" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"year" integer NOT NULL,
	"version" integer NOT NULL,
	"status" "budget_status" DEFAULT 'BROUILLON' NOT NULL,
	"adopted_on" date,
	"adopted_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "budget_line_id" text;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_lines_uq" ON "budget_lines" USING btree ("budget_id","account",coalesce("commission_id", ''));--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_year_version_uq" ON "budgets" USING btree ("year","version");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_draft_uq" ON "budgets" USING btree ("year") WHERE status = 'BROUILLON';--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_budget_line_id_budget_lines_id_fk" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id") ON DELETE no action ON UPDATE no action;