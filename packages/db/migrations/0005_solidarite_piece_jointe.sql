-- Aide de solidarité : pièce jointe facultative.
ALTER TABLE "solidarity_requests" ADD COLUMN "attachment_key" text;--> statement-breakpoint
ALTER TABLE "solidarity_requests" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "solidarity_requests" ADD COLUMN "attachment_type" text;