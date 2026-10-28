-- Pièces de dépense : signature du Trésorier et visa du CA (statuts, art. 22).
CREATE TYPE "public"."expense_status" AS ENUM('A_SIGNER', 'A_VISER', 'A_PAYER', 'PAYEE', 'REJETEE');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"number" serial NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"solidarity_request_id" text,
	"status" "expense_status" DEFAULT 'A_SIGNER' NOT NULL,
	"created_by" text NOT NULL,
	"signed_by" text,
	"signed_at" timestamp with time zone,
	"visa_by" text,
	"visa_at" timestamp with time zone,
	"rejected_by" text,
	"reject_reason" text,
	"ledger_entry_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_number_unique" UNIQUE("number"),
	CONSTRAINT "expenses_ledger_entry_id_unique" UNIQUE("ledger_entry_id")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_solidarity_request_id_solidarity_requests_id_fk" FOREIGN KEY ("solidarity_request_id") REFERENCES "public"."solidarity_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_aid_uq" ON "expenses" USING btree ("solidarity_request_id") WHERE status <> 'REJETEE';--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("status");