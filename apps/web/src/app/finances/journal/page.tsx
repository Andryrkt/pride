import Link from "next/link";
import { formatAriary } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { journal } from "@/lib/finances";
import { requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { addEntryAction, correctEntryAction } from "../actions";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ annee?: string; ok?: string }> }) {
  const v = await requireFinances();
  const sp = await searchParams;
  const ok = sp.ok;
  const thisYear = new Date().getFullYear();
  const year = Number(sp.annee) || thisYear;
  const entries = await journal(year);
  const rec = entries.filter((e) => e.direction === "RECETTE").reduce((s, e) => s + e.amount, 0);
  const dep = entries.filter((e) => e.direction === "DEPENSE").reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageTitle title="Journal comptable" sub="Statuts, art. 21 : une écriture validée ne peut être ni modifiée ni supprimée. Toute erreur est corrigée par une écriture de rectification.">
        <div className="flex flex-wrap gap-2">
          {/* Simple lien (pas next/link) : c'est un fichier à télécharger. */}
          <a href={`/api/finances/journal?annee=${year}`} download className={buttonVariants({ variant: "outline", size: "sm" })}>Exporter pour l'AG (CSV)</a>
        </div>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <nav aria-label="Exercice" className="flex flex-wrap gap-2">
        {[thisYear - 2, thisYear - 1, thisYear].map((y) => (
          <Link key={y} href={`/finances/journal?annee=${y}`} aria-current={y === year ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-[1.5px] ring-inset ${y === year ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5]"}`}>
            {y}
          </Link>
        ))}
      </nav>

      {v.canRecord && (
        <Card>
          <h2 className="mb-3 text-xl font-bold">Nouvelle écriture</h2>
          <ActionForm action={addEntryAction}>
            <RequiredLegend />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_180px_1fr_160px_160px]">
              <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <Select label="Recette ou dépense" name="direction" required defaultValue="">
                <option value="">Choisissez…</option>
                <option value="RECETTE">Recette</option>
                <option value="DEPENSE">Dépense</option>
              </Select>
              <Input label="Libellé" name="label" required placeholder="Ex. : Location de salle, formation art oratoire" />
              <Input label="Montant (Ar)" name="amount" type="number" min={1} step={1} required />
              <Input label="N° de pièce" name="pieceRef" placeholder="PJ-0185" />
            </div>
            <SubmitButton className="self-start">Enregistrer l'écriture</SubmitButton>
            <p className="text-sm text-muted">Les cotisations payées en ligne ou en espèces s'inscrivent automatiquement : ne les saisissez pas ici.</p>
          </ActionForm>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-200 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">N°</th><th>Date</th><th>Libellé</th><th>Pièce</th><th className="text-right">Recette</th><th className="text-right">Dépense</th><th className="px-4">Statut</th></tr>
          </thead>
          <tbody>
            {entries.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-muted">Aucune écriture en {year}.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="px-4 py-3 font-mono text-sm">{e.number}</td>
                <td className="py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="py-3">{e.label}</td>
                <td className="py-3">{e.pieceRef ?? "—"}</td>
                <td className="py-3 text-right whitespace-nowrap">{e.direction === "RECETTE" ? formatAriary(e.amount) : ""}</td>
                <td className="py-3 text-right whitespace-nowrap">{e.direction === "DEPENSE" ? formatAriary(e.amount) : ""}</td>
                <td className="px-4 py-3">
                  {e.correctsId ? (
                    <Badge tone="yellow">Rectification</Badge>
                  ) : e.corrected ? (
                    <Badge tone="gray">Rectifiée</Badge>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <Badge>Validée · verrouillée</Badge>
                      {v.canRecord && (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-semibold text-brand-600">Rectifier</summary>
                          <ActionForm action={correctEntryAction.bind(null, e.id)} className="mt-2 flex w-64 flex-col gap-2">
                            <Input label="Motif" name="reason" id={`reason-${e.id}`} required placeholder="Ex. : montant erroné" />
                            <SubmitButton size="sm" variant="danger" className="self-start">Enregistrer la rectification</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {entries.length > 0 && (
            <tfoot className="border-t-2 border-line font-bold">
              <tr><td colSpan={4} className="px-4 py-3">Totaux {year}</td><td className="py-3 text-right">{formatAriary(rec)}</td><td className="py-3 text-right">{formatAriary(dep)}</td><td className="px-4 py-3">Solde : {formatAriary(rec - dep)}</td></tr>
            </tfoot>
          )}
        </table>
      </Card>
    </>
  );
}
