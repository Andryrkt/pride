-- Rôle « Comptable » (espace Finances) et versement des aides de solidarité.
ALTER TYPE "public"."mandate_role" ADD VALUE 'COMPTABLE';--> statement-breakpoint
ALTER TYPE "public"."solidarity_status" ADD VALUE 'VERSEE';--> statement-breakpoint
ALTER TABLE "solidarity_requests" ADD COLUMN "paid_at" timestamp with time zone;