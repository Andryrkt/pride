import { desc, db, schema } from "@pride/db";
import { formatAriary, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { financeSummary } from "@/lib/finances";
import { requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { paySolidarityAction } from "./actions";

const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export default async function FinanceDashboard({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const v = await requireFinances();
  const [s, last] = await Promise.all([financeSummary(), db.query.ledgerEntries.findMany({ orderBy: desc(schema.ledgerEntries.number), limit: 5 })]);
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
          <h2 className="text-xl font-bold">Aides de solidarité à verser ({s.aidesAVerser.length})</h2>
          <p className="text-sm text-muted">Accordées par les dirigeants. Statuts, art. 22 : la pièce de dépense est signée par le Trésorier et visée par le conseil d'administration.</p>
          {s.aidesAVerser.length === 0 && <p className="text-muted">Aucune aide en attente de versement.</p>}
          {s.aidesAVerser.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <span><strong>{a.member.lastName} {a.member.firstNames}</strong> · {SOLIDARITE_EVENEMENTS[a.kind]} ({SOLIDARITE_CONCERNE[a.concerns].toLowerCase()})</span>
                <strong>{formatAriary(a.amount)}</strong>
              </div>
              <span className="text-sm text-muted">Accordée le {formatDate(a.decidedAt)}{a.member.phone ? ` · ${a.member.phone}` : ""}</span>
              {v.canRecord && (
                <ActionForm action={paySolidarityAction.bind(null, a.id)} className="flex flex-wrap items-end gap-2">
                  <Input label="N° de pièce (facultatif)" name="pieceRef" id={`piece-${a.id}`} placeholder="PJ-0190" className="flex-[1_1_160px]" />
                  <SubmitButton size="sm">Enregistrer le versement</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
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
