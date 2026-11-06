import Link from "next/link";
import { addDays, habitStreak, localDay, MAX_HABITUDES } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { LearnTabs, PracticeTabs } from "@/components/site/resources";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loadDiscipline, reviewPeriod } from "@/lib/discipline";
import { requireMember } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { addGoalAction, addHabitAction, closeGoalAction, saveReviewAction, stopHabitAction, toggleCheckAction } from "../actions";

const QUESTIONS = {
  JOUR: { wins: "Qu'est-ce qui a marché aujourd'hui ?", blocks: "Qu'est-ce qui a bloqué ?", priority: "Ma priorité pour demain" },
  SEMAINE: { wins: "Qu'est-ce qui a marché cette semaine ?", blocks: "Qu'est-ce qui a bloqué ?", priority: "Ma priorité pour la semaine prochaine" },
};

export default async function DisciplinePage({ searchParams }: { searchParams: Promise<{ bilan?: string }> }) {
  const { member } = await requireMember();
  const { bilan } = await searchParams;
  const kind = bilan === "jour" ? "JOUR" : "SEMAINE";
  const { habits, goals, reviews } = await loadDiscipline(member.id);
  const today = localDay();
  const yesterday = addDays(today, -1);
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const period = reviewPeriod(kind, today);
  const current = reviews.find((r) => r.kind === kind && r.periodStart === period);
  const past = reviews.filter((r) => r !== current);
  const q = QUESTIONS[kind];

  return (
    <>
      <PageTitle title="Autodiscipline" sub="Organiser son temps, tenir ses objectifs, prendre de bonnes habitudes." />
      <LearnTabs current="pratiques" />
      <PracticeTabs current="discipline" />
      <p className="rounded-xl bg-paper px-4 py-3 text-[15px]">Cet espace est affiché à vous seul : il ne figure dans aucune page des dirigeants et n'a aucun effet sur votre statut de membre.</p>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Mes habitudes</h2>
        {habits.length === 0 && <p className="text-muted">Commencez petit : choisissez une seule habitude, facile à tenir chaque jour.</p>}
        <ul className="flex flex-col gap-3">
          {habits.map((h) => {
            const days = h.checks.map((c) => c.day);
            const streak = habitStreak(days, today);
            const doneToday = days.includes(today);
            const doneCount = last30.filter((d) => days.includes(d)).length;
            return (
              <li key={h.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[17px]">{h.title}</strong>
                  <Badge tone={streak ? "green" : "gray"}>{streak} jour{streak > 1 ? "s" : ""} d'affilée</Badge>
                </div>
                <div role="img" aria-label={`${doneCount} jours faits sur les 30 derniers`} className="flex flex-wrap gap-1">
                  {last30.map((d) => (
                    <span key={d} title={d} className={cn("size-3 rounded-sm", days.includes(d) ? "bg-brand-600" : "bg-[#ecefea]")} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleCheckAction.bind(null, h.id, today)}>
                    <SubmitButton size="sm" variant={doneToday ? "outline" : "primary"} pendingLabel="…">{doneToday ? "Fait aujourd'hui ✓ (annuler)" : "Fait aujourd'hui"}</SubmitButton>
                  </form>
                  {!days.includes(yesterday) && (
                    <form action={toggleCheckAction.bind(null, h.id, yesterday)}>
                      <SubmitButton size="sm" variant="ghost" pendingLabel="…">Fait hier aussi</SubmitButton>
                    </form>
                  )}
                  <form action={stopHabitAction.bind(null, h.id)} className="ml-auto">
                    <SubmitButton size="sm" variant="ghost" pendingLabel="…">Arrêter</SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        {habits.length < MAX_HABITUDES ? (
          <ActionForm action={addHabitAction} className="flex flex-col gap-3 border-t border-line pt-4">
            <Input label="Nouvelle habitude" name="title" id="habit-title" required maxLength={160} placeholder="Lire 10 minutes"
              hint={habits.length ? "Ajoutez-en une autre seulement si les précédentes sont devenues faciles." : undefined} />
            <SubmitButton variant="outline" className="self-start">Ajouter l'habitude</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted">{MAX_HABITUDES} habitudes au maximum : mieux vaut en tenir peu. Arrêtez-en une pour en ajouter une autre.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Mes objectifs</h2>
        {goals.length === 0 && <p className="text-muted">Aucun objectif pour l'instant.</p>}
        <ul className="divide-y divide-line">
          {goals.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="flex min-w-0 flex-col">
                <strong>{g.title}</strong>
                {g.dueOn && <span className={cn("text-sm", g.status === "EN_COURS" && g.dueOn < today ? "font-semibold text-flame-800" : "text-muted")}>Avant le {formatDate(g.dueOn)}</span>}
              </span>
              {g.status === "EN_COURS" ? (
                <span className="flex flex-wrap gap-2">
                  <form action={closeGoalAction.bind(null, g.id, "ATTEINT")}><SubmitButton size="sm" variant="outline" pendingLabel="…">Atteint</SubmitButton></form>
                  <form action={closeGoalAction.bind(null, g.id, "ABANDONNE")}><SubmitButton size="sm" variant="ghost" pendingLabel="…">Abandonner</SubmitButton></form>
                </span>
              ) : (
                <Badge tone={g.status === "ATTEINT" ? "green" : "gray"}>{g.status === "ATTEINT" ? "Atteint" : "Abandonné"}</Badge>
              )}
            </li>
          ))}
        </ul>
        <ActionForm action={addGoalAction} className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <Input label="Nouvel objectif" name="title" id="goal-title" required maxLength={160} placeholder="Finir ma formation en bureautique" />
            <Input label="Date limite (facultative)" name="dueOn" id="goal-due" type="date" min={today} />
          </div>
          <SubmitButton variant="outline" className="self-start">Ajouter l'objectif</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Mon bilan</h2>
        <nav aria-label="Période du bilan" className="flex flex-wrap gap-2">
          {[["jour", "JOUR", "Aujourd'hui"], ["semaine", "SEMAINE", "Cette semaine"]].map(([slug, k, label]) => (
            <Link key={k} href={`/membre/discipline?bilan=${slug}`} aria-current={kind === k ? "page" : undefined}
              className={cn("rounded-full px-4 py-2.5 text-sm font-semibold ring-[1.5px] ring-inset", kind === k ? "bg-brand-800 text-white ring-brand-800" : "bg-white ring-[#c3ccc5]")}>
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted">Répondez à ce qui vous est utile : un bilan peut se compléter jusqu'à la fin de la période.</p>
        <ActionForm key={kind} action={saveReviewAction.bind(null, kind)}>
          <Textarea label={q.wins} name="wins" rows={2} maxLength={2000} defaultValue={current?.wins ?? ""} />
          <Textarea label={q.blocks} name="blocks" rows={2} maxLength={2000} defaultValue={current?.blocks ?? ""} />
          <Textarea label={q.priority} name="priority" rows={2} maxLength={2000} defaultValue={current?.priority ?? ""} />
          <SubmitButton className="self-start">Enregistrer le bilan</SubmitButton>
        </ActionForm>
        {past.length > 0 && (
          <details className="border-t border-line pt-3">
            <summary className="cursor-pointer font-semibold text-brand-600">Mes bilans passés ({past.length})</summary>
            <ul className="mt-3 flex flex-col gap-3 text-[15px]">
              {past.map((r) => (
                <li key={r.id} className="whitespace-pre-line rounded-xl bg-paper p-3">
                  <strong>{r.kind === "JOUR" ? `Jour du ${formatDate(r.periodStart)}` : `Semaine du ${formatDate(r.periodStart)}`}</strong>
                  {r.wins && <p><span className="text-muted">A marché : </span>{r.wins}</p>}
                  {r.blocks && <p><span className="text-muted">A bloqué : </span>{r.blocks}</p>}
                  {r.priority && <p><span className="text-muted">Priorité : </span>{r.priority}</p>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </>
  );
}
