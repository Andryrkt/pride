import { and, count, db, eq, inArray, schema, sql, sum } from "@pride/db";
import { formatAriary, periodOf } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DirigeantsHome() {
  const period = periodOf(new Date());
  const [[members], [minors], [pending], [due], [paid], [late]] = await Promise.all([
    db.select({ n: count() }).from(schema.members).where(eq(schema.members.status, "ACTIF")),
    db.select({ n: count() }).from(schema.members).where(and(eq(schema.members.status, "ACTIF"), eq(schema.members.category, "ACTIF_MINEUR"))),
    db.select({ n: count() }).from(schema.applications).where(inArray(schema.applications.status, ["SOUMISE", "ENTRETIEN", "VOTE_CA", "AGREEE"])),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(eq(schema.dues.period, period)),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(and(eq(schema.dues.period, period), eq(schema.dues.status, "PAYEE"))),
    db
      .select({ n: sql<number>`count(distinct ${schema.dues.memberId})` })
      .from(schema.dues)
      .where(and(eq(schema.dues.status, "A_PAYER"), sql`${schema.dues.period} < ${period}`)),
  ]);
  const kpis = [
    ["Membres actifs", String(members!.n), `dont ${minors!.n} mineurs`],
    ["Candidatures en cours", String(pending!.n), "à traiter"],
    ["Cotisations du mois", formatAriary(Number(paid!.s ?? 0)), `sur ${formatAriary(Number(due!.s ?? 0))} attendus`],
    ["Membres en retard", String(late!.n), "au moins un mois impayé"],
  ];
  return (
    <>
      <PageTitle title="Tableau de bord" sub="Vue d'ensemble de l'association" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([t, v, s]) => (
          <Card key={t}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t}</div>
            <div className="font-display text-3xl font-extrabold">{v}</div>
            <div className="text-sm text-muted">{s}</div>
          </Card>
        ))}
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Candidatures à traiter</h2>
          <p className="text-muted">Parrainage ou entretien, vote du conseil d'administration, puis création de la fiche membre.</p>
        </div>
        <ButtonLink href="/dirigeants/adhesions">Ouvrir</ButtonLink>
      </Card>
    </>
  );
}
