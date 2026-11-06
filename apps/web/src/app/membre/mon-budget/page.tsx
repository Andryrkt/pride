import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BUDGET_CATEGORIES, budgetSummary, formatAriary, localDay, shiftMonth, type BudgetCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { LearnTabs, PracticeTabs } from "@/components/site/resources";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loadMonth, monthParam } from "@/lib/personal-budget";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { addBudgetEntryAction, deleteBudgetEntryAction, setSavingGoalAction } from "../actions";

const CATS = Object.keys(BUDGET_CATEGORIES) as BudgetCategory[];
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function MonBudgetPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { mois } = await searchParams;
  const v = await requireMember();
  const today = localDay();
  const month = monthParam(mois);
  const isCurrent = month === today.slice(0, 7);
  const { entries, goal } = await loadMonth(v.member.id, month);
  const s = budgetSummary(entries, goal);

  return (
    <>
      <PageTitle title="Mon budget" sub="Savoir où va son argent et épargner un peu chaque mois." />
      <LearnTabs current="pratiques" />
      <PracticeTabs current="budget" />
      <p className="rounded-xl bg-paper px-4 py-3 text-[15px]">Ce budget est affiché à vous seul : il ne figure dans aucune page des dirigeants et n'a aucun lien avec la comptabilité de l'association.</p>

      <div className="flex items-center justify-between gap-3">
        <Link href={`/membre/mon-budget?mois=${shiftMonth(month, -1)}`} className="flex items-center gap-1 rounded-xl px-3 py-2 font-semibold text-brand-800 hover:bg-[#e9eee8]"><ChevronLeft className="size-5" aria-hidden />Mois précédent</Link>
        <h2 className="text-2xl font-extrabold first-letter:uppercase">{monthLabel(month)}</h2>
        {isCurrent ? <span className="w-36" /> : <Link href={`/membre/mon-budget?mois=${shiftMonth(month, 1)}`} className="flex items-center gap-1 rounded-xl px-3 py-2 font-semibold text-brand-800 hover:bg-[#e9eee8]">Mois suivant<ChevronRight className="size-5" aria-hidden /></Link>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-sm font-semibold text-muted">Revenus</div><div className="text-2xl font-extrabold text-brand-800">{formatAriary(s.income)}</div></Card>
        <Card className="p-5"><div className="text-sm font-semibold text-muted">Dépenses</div><div className="text-2xl font-extrabold text-flame-800">{formatAriary(s.expenses)}</div></Card>
        <Card className="p-5"><div className="text-sm font-semibold text-muted">Reste (épargne du mois)</div><div className={cn("text-2xl font-extrabold", s.balance < 0 ? "text-flame-800" : "text-brand-800")}>{formatAriary(s.balance)}</div></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Objectif d'épargne</h2>
          {s.goal ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{formatAriary(Math.max(0, s.balance))} sur {formatAriary(s.goal)} par mois</span>
                <Badge tone={s.goalReached ? "green" : "yellow"}>{s.goalReached ? "Objectif atteint" : `${Math.round((s.goalProgress ?? 0) * 100)} %`}</Badge>
              </div>
              <div role="img" aria-label={`Objectif atteint à ${Math.round((s.goalProgress ?? 0) * 100)} %`} className="h-3 overflow-hidden rounded-full bg-[#ecefea]">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round((s.goalProgress ?? 0) * 100)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-muted">Fixez une somme à mettre de côté chaque mois, même petite : c'est la première règle de l'intelligence financière.</p>
          )}
          <ActionForm action={setSavingGoalAction} className="flex flex-wrap items-end gap-3">
            <Input label="Épargne visée par mois (Ar)" name="goal" id="goal" inputMode="numeric" defaultValue={goal ?? ""} placeholder="Ex. : 50000" hint="Laissez vide pour retirer l'objectif." className="flex-[1_1_200px]" />
            <SubmitButton variant="outline">Enregistrer</SubmitButton>
          </ActionForm>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Où va mon argent ?</h2>
          {s.byCategory.length === 0 && <p className="text-muted">Aucune dépense ce mois-ci.</p>}
          <ul className="flex flex-col gap-2.5">
            {s.byCategory.map((c) => (
              <li key={c.category} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-[15px]"><span>{BUDGET_CATEGORIES[c.category as BudgetCategory]?.label ?? c.category}</span><span className="font-semibold">{formatAriary(c.amount)} · {Math.round(c.share * 100)} %</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[#ecefea]"><div className="h-full rounded-full bg-flame-600" style={{ width: `${Math.round(c.share * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Ajouter un revenu ou une dépense</h2>
        <ActionForm action={addBudgetEntryAction} className="flex flex-col gap-3">
          <RequiredLegend />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Catégorie" name="category" id="budget-category" required defaultValue="">
              <option value="" disabled>Choisissez…</option>
              <optgroup label="Revenus">{CATS.filter((k) => BUDGET_CATEGORIES[k].kind === "REVENU").map((k) => <option key={k} value={k}>{BUDGET_CATEGORIES[k].label}</option>)}</optgroup>
              <optgroup label="Dépenses">{CATS.filter((k) => BUDGET_CATEGORIES[k].kind === "DEPENSE").map((k) => <option key={k} value={k}>{BUDGET_CATEGORIES[k].label}</option>)}</optgroup>
            </Select>
            <Input label="Montant (Ar)" name="amount" id="budget-amount" required inputMode="numeric" placeholder="Ex. : 15000" />
            <Input label="Date" name="day" id="budget-day" type="date" required max={today} defaultValue={isCurrent ? today : `${month}-01`} />
            <Input label="Libellé" name="label" id="budget-label" maxLength={120} placeholder="Ex. : taxi-be de la semaine" />
          </div>
          <SubmitButton className="self-start">Ajouter</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Lignes du mois ({entries.length})</h2>
        {entries.length === 0 && <p className="text-muted">Rien de noté pour ce mois. Notez vos dépenses au fil des jours : quelques secondes suffisent.</p>}
        <ul className="divide-y divide-line">
          {entries.map((e) => {
            const cat = BUDGET_CATEGORIES[e.category as BudgetCategory];
            const revenue = cat?.kind === "REVENU";
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[15px]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-muted">{dayLabel(e.day)}</span>
                  <strong>{cat?.label ?? e.category}</strong>
                  {e.label && <span className="text-muted">· {e.label}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className={cn("font-semibold", revenue ? "text-brand-800" : "text-flame-800")}>{revenue ? "+" : "−"} {formatAriary(e.amount)}</span>
                  <ActionForm action={deleteBudgetEntryAction.bind(null, e.id)} className="flex">
                    <SubmitButton variant="outline" size="sm" pendingLabel="…" aria-label={`Supprimer : ${cat?.label ?? e.category} ${formatAriary(e.amount)}`}>Supprimer</SubmitButton>
                  </ActionForm>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
