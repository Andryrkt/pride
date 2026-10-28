-- Livre comptable : compte (catégorie) de chaque écriture et de chaque pièce de dépense. Les écritures déjà validées ne sont pas modifiées (statuts, art. 21).
ALTER TABLE "expenses" ADD COLUMN "account" text;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "account" text;