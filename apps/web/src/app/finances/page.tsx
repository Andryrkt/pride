import { desc, db, schema } from "@pride/db";
import { formatAriary } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { EXPENSE_STATUS, expenseList, financeSummary, pieceRef } from "@/lib/finances";
import { requireFinances } from "@/lib/session";

const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export default async function FinanceDashboard({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  await requireFinances();
  const [s, ex, last] = await Promise.all([financeSummary(), expenseList(), db.query.ledgerEntries.findMany({ orderBy: desc(schema.ledgerEntries.number), limit: 5 })]);
  const month = monthName.format(new Date());
  const kpis = [
    ["Solde du journal", formatAriary(s.solde), "recettes moins dépenses, depuis le début", s.solde < 0 ? "text-flame-600" : ""],
    [`Recettes de ${month}`, `+ ${formatAriary(s.recettesMois)}`, "cotisations, droits d'entrée, autres", "text-brand-600"],
    [`Dépenses de ${month}`, `− ${formatAriary(s.depensesMois)}`, "dont aides de solidarité", "text-flame-600"],
    ["Cotisations du mois", formatAriary(s.cotisationsPayees), `sur ${formatAriary(s.cotisationsAttendues)} attendus`, ""],
  ];

  return (
    <>
      <PageTitle title="Finances" sub="Exercice en cours · statuts, art. 21 : une écriture validée ne peut être ni modifiée ni supprimée." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([t, val, sub, cls]) => (
          <Card key={t}>
            <div className="text-xs font-bold tracking-wider text-muted uppercase">{t}</div>
            <div className={`font-display text-2xl font-extrabold ${cls}`}>{val}</div>
            <div className="text-sm text-muted">{sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Dépenses en attente ({ex.open.length + ex.aidsWithoutPiece.length})</h2>
            <ButtonLink href="/finances/depenses" variant="ghost" size="sm">Tout voir</ButtonLink>
          </div>
          <p className="text-sm text-muted">Statuts, art. 22 : toute pièce de dépense est signée par le Trésorier et visée par le conseil d'administration avant d'être payée.</p>
          {ex.open.length + ex.aidsWithoutPiece.length === 0 && <p className="text-muted">Aucune dépense en attente.</p>}
          {ex.aidsWithoutPiece.length > 0 && <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">{ex.aidsWithoutPiece.length} aide(s) de solidarité accordée(s) : pièce de dépense à préparer.</p>}
          <ul className="divide-y divide-line text-[14.5px]">
            {ex.open.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">{pieceRef(e.number)} · {e.label}</span>
                <span className="flex items-center gap-2"><Badge tone={EXPENSE_STATUS[e.status][1]}>{EXPENSE_STATUS[e.status][0]}</Badge><strong>{formatAriary(e.amount)}</strong></span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Membres en retard</h2>
              <p className="text-muted">{s.membresEnRetard} membre(s) avec au moins un mois impayé · {formatAriary(s.montantEnRetard)} à recouvrer</p>
            </div>
            <ButtonLink href="/finances/paiements#retards" variant="outline">Voir la liste</ButtonLink>
          </Card>
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Dernières écritures</h2>
              <ButtonLink href="/finances/journal" variant="ghost" size="sm">Journal complet</ButtonLink>
            </div>
            <ul className="divide-y divide-line text-[14.5px]">
              {last.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">n° {e.number} · {e.label}</span>
                  <strong className={`shrink-0 ${e.direction === "RECETTE" ? "text-brand-600" : "text-flame-600"}`}>{e.direction === "RECETTE" ? "+" : "−"} {formatAriary(e.amount)}</strong>
                </li>
              ))}
              {last.length === 0 && <li className="py-2 text-muted">Aucune écriture pour le moment.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
