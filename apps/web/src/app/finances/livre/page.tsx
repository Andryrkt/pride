import Link from "next/link";
import { formatAriary } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { ledgerBook } from "@/lib/finances";
import { requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";

/** Livre comptable : les écritures du journal regroupées par compte (cotisations, aides de solidarité…), avec les totaux. */
export default async function BookPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  await requireFinances();
  const sp = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = Number(sp.annee) || thisYear;
  const accounts = await ledgerBook(year);
  const rec = accounts.reduce((s, a) => s + a.recettes, 0);
  const dep = accounts.reduce((s, a) => s + a.depenses, 0);

  return (
    <>
      <PageTitle title="Livre comptable" sub="Les mêmes écritures que le journal, regroupées par compte : combien pour chaque poste. Utile pour le rapport financier de l'AG." />

      <nav aria-label="Exercice" className="flex flex-wrap gap-2">
        {[thisYear - 2, thisYear - 1, thisYear].map((y) => (
          <Link key={y} href={`/finances/livre?annee=${y}`} aria-current={y === year ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-[1.5px] ring-inset ${y === year ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5]"}`}>
            {y}
          </Link>
        ))}
      </nav>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-6 pt-5 pb-2 text-xl font-bold">Résumé par compte · {year}</h2>
        <table className="w-full min-w-150 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Compte</th><th className="text-right">Recettes</th><th className="text-right">Dépenses</th><th className="px-4 text-right">Solde</th></tr>
          </thead>
          <tbody>
            {accounts.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-muted">Aucune écriture en {year}.</td></tr>}
            {accounts.map((a) => (
              <tr key={a.label} className="border-t border-line">
                <td className="px-4 py-3"><a href={`#compte-${a.key ?? "non-classe"}`} className="font-semibold text-brand-600 hover:underline">{a.label}</a></td>
                <td className="py-3 text-right whitespace-nowrap">{a.recettes ? formatAriary(a.recettes) : ""}</td>
                <td className="py-3 text-right whitespace-nowrap">{a.depenses ? formatAriary(a.depenses) : ""}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatAriary(a.recettes - a.depenses)}</td>
              </tr>
            ))}
          </tbody>
          {accounts.length > 0 && (
            <tfoot className="border-t-2 border-line font-bold">
              <tr><td className="px-4 py-3">Totaux {year}</td><td className="py-3 text-right">{formatAriary(rec)}</td><td className="py-3 text-right">{formatAriary(dep)}</td><td className="px-4 py-3 text-right">{formatAriary(rec - dep)}</td></tr>
            </tfoot>
          )}
        </table>
      </Card>

      {accounts.map((a) => (
        <Card key={a.label} id={`compte-${a.key ?? "non-classe"}`} className="overflow-x-auto p-0">
          <h2 className="px-6 pt-5 pb-2 text-xl font-bold">{a.label}</h2>
          <table className="w-full min-w-170 text-left text-[14.5px]">
            <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
              <tr><th className="px-4 py-3">N°</th><th>Date</th><th>Libellé</th><th>Pièce</th><th className="text-right">Recette</th><th className="px-4 text-right">Dépense</th></tr>
            </thead>
            <tbody>
              {a.entries.map((e) => (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-mono text-sm">{e.number}</td>
                  <td className="py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="py-3">{e.label}</td>
                  <td className="py-3">{e.pieceRef ?? "—"}</td>
                  <td className="py-3 text-right whitespace-nowrap">{e.direction === "RECETTE" ? formatAriary(e.amount) : ""}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{e.direction === "DEPENSE" ? formatAriary(e.amount) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line font-bold">
              <tr><td colSpan={4} className="px-4 py-3">Total · solde {formatAriary(a.recettes - a.depenses)}</td><td className="py-3 text-right">{formatAriary(a.recettes)}</td><td className="px-4 py-3 text-right">{formatAriary(a.depenses)}</td></tr>
            </tfoot>
          </table>
        </Card>
      ))}
    </>
  );
}
