import { asc, db, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { DraftLines, FollowUpTable, YearTabs } from "@/components/finances/budget-views";
import { ActionForm } from "@/components/ui/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { budgetFollowUp, budgetsOf } from "@/lib/budget";
import { canAdoptBudget, canEditBudgetLine, canPrepareBudget, requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { adoptBudgetAction, createBudgetAction } from "./actions";

const STATUS = { BROUILLON: ["Brouillon", "yellow"], ADOPTE: ["En vigueur", "green"], REMPLACE: ["Remplacé", "gray"] } as const;

/** Budget annuel : préparé par le comptable, le Trésorier, le Coordonnateur et les commissions, adopté par le CA, puis suivi. */
export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ annee?: string; ok?: string }> }) {
  const v = await requireFinances();
  const sp = await searchParams;
  const year = Number(sp.annee) || new Date().getFullYear();
  const [{ adopted, draft, history }, followUp, commissions] = await Promise.all([budgetsOf(year), budgetFollowUp(year), db.query.commissions.findMany({ orderBy: asc(schema.commissions.name) })]);

  return (
    <>
      <PageTitle title="Budget" sub="Préparé par le comptable, le Trésorier, le Coordonnateur et les responsables de commission ; adopté par le conseil d'administration ; puis comparé au réalisé.">
        {/* Simple lien (pas next/link) : c'est un fichier à télécharger. */}
        <a href={`/api/finances/budget?annee=${year}`} download className={buttonVariants({ variant: "outline", size: "sm" })}>Exporter le suivi (CSV)</a>
      </PageTitle>
      {sp.ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{sp.ok}</p>}
      <YearTabs base="/finances/budget" year={year} />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Budget {year} en vigueur</h2>
        {adopted ? (
          <>
            <p className="text-muted">Version {adopted.version}{adopted.version > 1 ? " (rectificatif)" : ""}, adoptée par le CA le {formatDate(adopted.adoptedOn)}. Le réalisé vient du journal ; l'engagé, des pièces de dépense en cours.</p>
            <FollowUpTable lines={followUp.lines} outside={followUp.outside} />
          </>
        ) : (
          <p className="text-muted">Aucun budget adopté pour {year}.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{draft ? `Brouillon : ${draft.version > 1 ? `budget rectificatif (version ${draft.version})` : "budget initial"}` : "Préparation"}</h2>
        {!draft && canPrepareBudget(v) && (
          <ActionForm action={createBudgetAction.bind(null, year, "/finances/budget")} className="flex flex-col gap-1 self-start">
            <SubmitButton>{adopted ? `Préparer un budget rectificatif ${year}` : `Préparer le budget ${year}`}</SubmitButton>
          </ActionForm>
        )}
        {!draft && !canPrepareBudget(v) && <p className="text-muted">Aucun brouillon en préparation.</p>}
        {draft && (
          <>
            <DraftLines draft={draft} commissions={commissions} canEdit={(c) => canEditBudgetLine(v, c)} />
            {canAdoptBudget(v) && (
              <Card>
                <h3 className="mb-1 text-xl font-bold">Adoption par le conseil d'administration</h3>
                <p className="mb-3 text-sm text-muted">Une fois adopté, le budget est verrouillé{adopted ? ` et remplace la version ${adopted.version}` : ""}. Les dépenses sont ensuite imputées à ses lignes.</p>
                <ActionForm action={adoptBudgetAction.bind(null, draft.id)} className="flex flex-wrap items-end gap-3">
                  <Input label="Date de la réunion du CA" name="meetingDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                  <SubmitButton>Adopter le budget</SubmitButton>
                </ActionForm>
              </Card>
            )}
          </>
        )}
      </section>

      {history.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Versions {year}</h2>
          <ul className="divide-y divide-line">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>Version {b.version}{b.version > 1 ? " (rectificatif)" : ""} · {b.lines.length} ligne(s){b.adoptedOn ? ` · adoptée le ${formatDate(b.adoptedOn)}` : ""}</span>
                <Badge tone={STATUS[b.status][1]}>{STATUS[b.status][0]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
