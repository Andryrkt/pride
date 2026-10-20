-- Statuts, art. 21 : « aucune écriture validée ne peut être modifiée ou supprimée :
-- toute erreur est corrigée par une écriture de rectification ».
CREATE OR REPLACE FUNCTION pride_ledger_immuable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Journal comptable : les écritures validées ne peuvent être ni modifiées ni supprimées (statuts, art. 21). Utilisez une écriture de rectification.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_immuable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION pride_ledger_immuable();
