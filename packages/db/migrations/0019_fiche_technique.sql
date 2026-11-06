ALTER TABLE "members" ADD COLUMN "technical" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Fiches déjà créées par le script de données initiales : premier administrateur (production) et administrateur de démonstration.
UPDATE "members" SET "technical" = true
WHERE ("last_name" = 'ADMINISTRATEUR' AND "first_names" = 'Technique') OR ("last_name" = 'Démo' AND "first_names" = 'Administrateur');--> statement-breakpoint
-- Une fiche technique ne paie pas de cotisation : on retire ses échéances encore à payer (celles payées ou déclarées restent).
DELETE FROM "dues" WHERE "status" = 'A_PAYER' AND "payment_id" IS NULL AND "member_id" IN (SELECT "id" FROM "members" WHERE "technical");
