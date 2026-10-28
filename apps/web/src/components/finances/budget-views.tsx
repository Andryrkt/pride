import Link from "next/link";
import { accountsFor, formatAriary, LEDGER_ACCOUNTS } from "@pride/shared";
import { removeLineAction, saveLineAction } from "@/app/finances/budget/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { budgetFollowUp, budgetsOf } from "@/lib/budget";
import { accountLabel } from "@/lib/finances";

type FollowUp = Awaited<ReturnType<typeof budgetFollowUp>>;
type Draft = NonNullable<Awaited<ReturnType<typeof budgetsOf>>["draft"]>;

/** Exercices proposés : l'année passée, l'année en cours et la suivante (le budget se prépare à l'avance). */
export function YearTabs({ base, year }: { base: string; year: number }) {
  const now = new Date().getFullYear();
  return (
    <nav aria-label="Exercice" className="flex flex-wrap gap-2">
      {[now - 1, now, now + 1].map((y) => (
        <Link key={y} href={`${base}?annee=${y}`} aria-current={y === year ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-[1.5px] ring-inset ${y === year ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5]"}`}>
          {y}
        </Link>
      ))}
    </nav>
  );
}

const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)} %` : "");

/** Prévu, réalisé, engagé et reste, ligne par ligne, recettes puis dépenses ; puis ce qui est hors budget. */
export function FollowUpTable({ lines, outside }: Pick<FollowUp, "lines" | "outside">) {
  const sections = (["RECETTE", "DEPENSE"] as const).map((d) => ({ d, rows: lines.filter((l) => l.direction === d), out: outside.filter((o) => o.direction === d) }));
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-200 text-left text-[14.5px] [&_td]:pl-4 [&_th]:pl-4">
        <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
          <tr><th className="px-4 py-3">Ligne</th><th className="text-right">Prévu</th><th className="text-right">Réalisé</th><th className="text-right">Engagé</th><th className="text-right">Reste</th><th className="px-4 text-right">Réalisé / prévu</th></tr>
        </thead>
        {sections.map(({ d, rows, out }) =>
          rows.length + out.length === 0 ? null : (
            <tbody key={d}>
              <tr className="border-t border-line bg-paper/60"><th colSpan={6} className="px-4 py-2 font-bold">{d === "RECETTE" ? "Recettes" : "Dépenses"}</th></tr>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{l.accountLabel}</span> · {l.commission}
                    {l.label && <><br /><span className="text-muted">{l.label}</span></>}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">{formatAriary(l.prevu)}</td>
                  <td className="py-3 text-right whitespace-nowrap">{formatAriary(l.realise)}</td>
                  <td className="py-3 text-right whitespace-nowrap">{l.engage ? formatAriary(l.engage) : "—"}</td>
                  <td className={`py-3 text-right font-semibold whitespace-nowrap ${d === "DEPENSE" && l.reste < 0 ? "text-flame-600" : ""}`}>{formatAriary(l.reste)}</td>
                  <td className="px-4 py-3 text-right">{pct(l.realise, l.prevu)}</td>
                </tr>
              ))}
              {out.map((o) => (
                <tr key={o.key} className="border-t border-line align-top">
                  <td className="px-4 py-3"><span className="font-semibold">{o.accountLabel}</span> · <span className="rounded bg-sun-50 px-1.5 text-sun-800">hors budget</span></td>
                  <td className="py-3 text-right">—</td>
                  <td className="py-3 text-right whitespace-nowrap">{formatAriary(o.realise)}</td>
                  <td className="py-3 text-right whitespace-nowrap">{o.engage ? formatAriary(o.engage) : "—"}</td>
                  <td className="py-3 text-right">—</td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          ),
        )}
      </table>
    </Card>
  );
}

/** Lignes d'un brouillon, avec ajout et retrait pour les lignes que le visiteur peut modifier. */
export function DraftLines({ draft, commissions, canEdit }: { draft: Draft; commissions: { id: string; name: string }[]; canEdit: (commissionId: string | null) => boolean }) {
  const total = (d: "RECETTE" | "DEPENSE") => draft.lines.filter((l) => LEDGER_ACCOUNTS[l.account as keyof typeof LEDGER_ACCOUNTS]?.[1] === d).reduce((s, l) => s + l.amount, 0);
  const options = [{ id: "", name: "Général" }, ...commissions].filter((c) => canEdit(c.id || null));
  return (
    <>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-170 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Compte</th><th>Commission</th><th>Description</th><th className="text-right">Prévu</th><th className="px-4" /></tr>
          </thead>
          <tbody>
            {draft.lines.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-muted">Aucune ligne pour le moment.</td></tr>}
            {draft.lines.map((l) => (
              <tr key={l.id} className="border-t border-line align-top">
                <td className="px-4 py-3">{accountLabel(l.account)}</td>
                <td className="py-3">{l.commission?.name ?? "Général"}</td>
                <td className="py-3">{l.label ?? "—"}</td>
                <td className="py-3 text-right whitespace-nowrap">{formatAriary(l.amount)}</td>
                <td className="px-4 py-3 text-right">
                  {canEdit(l.commissionId) && (
                    <ActionForm action={removeLineAction.bind(null, l.id)} className="flex flex-col items-end gap-1">
                      <SubmitButton size="sm" variant="ghost">Retirer</SubmitButton>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-line font-bold">
            <tr><td colSpan={5} className="px-4 py-3">Recettes prévues : {formatAriary(total("RECETTE"))} · dépenses prévues : {formatAriary(total("DEPENSE"))} · solde prévu : {formatAriary(total("RECETTE") - total("DEPENSE"))}</td></tr>
          </tfoot>
        </table>
      </Card>

      {options.length > 0 && (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Ajouter ou modifier une ligne</h2>
          <p className="mb-3 text-sm text-muted">Une ligne par compte et par commission : saisir à nouveau le même compte pour la même commission remplace son montant.</p>
          <ActionForm action={saveLineAction.bind(null, draft.id)}>
            <RequiredLegend />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_1fr_180px]">
              <Select label="Compte" name="account" required defaultValue="">
                <option value="">Choisissez…</option>
                <optgroup label="Recettes">{accountsFor("RECETTE").map((k) => <option key={k} value={k}>{LEDGER_ACCOUNTS[k][0]}</option>)}</optgroup>
                <optgroup label="Dépenses">{accountsFor("DEPENSE").map((k) => <option key={k} value={k}>{LEDGER_ACCOUNTS[k][0]}</option>)}</optgroup>
              </Select>
              <Select label="Commission" name="commissionId" defaultValue={options[0]!.id}>
                {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input label="Description" name="label" placeholder="Ex. : 4 ateliers de formation" />
              <Input label="Montant prévu (Ar)" name="amount" type="number" min={1} step={1} required />
            </div>
            <SubmitButton className="self-start">Enregistrer la ligne</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
