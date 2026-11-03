CREATE TABLE "payment_accounts" (
	"provider" "payment_provider" PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"holder" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_to" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_name" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_type" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_uq" ON "payments" USING btree ("provider","provider_ref") WHERE "payments"."status" <> 'ECHOUE' and "payments"."provider_ref" is not null;