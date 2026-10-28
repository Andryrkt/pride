import { redirect } from "next/navigation";
import { asc, db, inArray, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { DraftLines, FollowUpTable, YearTabs } from "@/components/finances/budget-views";
import { budgetFollowUp, budgetsOf } from "@/lib/budget";
import { canEditBudgetLine, requireMember } from "@/lib/session";
import { formatDate } from "@/lib/utils";

/** Responsables de commission : lignes du budget de leur commission (préparation et suivi). */
export default async function CommissionBudgetPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const v = await requireMember();
  if (!v.commissionIds.length) redirect("/membre");
  const year = Number((await searchParams).annee) || new Date().getFullYear();
  const [{ adopted, draft }, followUp, commissions] = await Promise.all([
    budgetsOf(year),
    budgetFollowUp(year),
    db.query.commissions.findMany({ where: inArray(schema.commissions.id, v.commissionIds), orderBy: asc(schema.commissions.name) }),
  ]);
  const mine = (commissionId: string | null) => !!commissionId && v.commissionIds.includes(commissionId);

  return (
    <>
      <PageTitle title="Budget de ma commission" sub={`${commissions.map((c) => c.name).join(", ")} : vous préparez les lignes de votre commission ; le conseil d'administration adopte le budget complet.`} />
      <YearTabs base="/membre/budget" year={year} />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Budget {year} en vigueur</h2>
        {adopted ? (
          <>
            <p className="text-muted">Version {adopted.version}, adoptée par le CA le {formatDate(adopted.adoptedOn)}.</p>
            <FollowUpTable lines={followUp.lines.filter((l) => mine(l.commissionId))} outside={followUp.outside.filter((o) => mine(o.commissionId))} />
          </>
        ) : (
          <p className="text-muted">Aucun budget adopté pour {year}.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Préparation</h2>
        {draft ? (
          <DraftLines draft={{ ...draft, lines: draft.lines.filter((l) => mine(l.commissionId)) }} commissions={commissions} canEdit={(c) => !!c && canEditBudgetLine(v, c) && mine(c)} />
        ) : (
          <p className="text-muted">Aucun budget en préparation pour {year}. Le comptable, le Trésorier ou le Coordonnateur ouvre la préparation ; vous pourrez alors saisir les lignes de votre commission.</p>
        )}
      </section>
    </>
  );
}
