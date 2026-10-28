import { and, asc, count, db, eq, gte, inArray, isNull, or, schema, sql, sum } from "@pride/db";
import { formatAriary, periodOf, ROLE_LABELS, type MandateRole } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireDirigeant } from "@/lib/session";
import { DUTIES, leaderTodos } from "@/lib/todos";
import { formatDate } from "@/lib/utils";

/** Tableau de bord des dirigeants : chiffres clés, tâches selon le rôle, responsabilités et mandats (maquette « Tableau de bord »). */
export default async function DirigeantsHome() {
  const v = await requireDirigeant();
  const period = periodOf(new Date());
  const [[members], [minors], [pending], [due], [paid], [late], todos, mandates] = await Promise.all([
    db.select({ n: count() }).from(schema.members).where(eq(schema.members.status, "ACTIF")),
    db.select({ n: count() }).from(schema.members).where(and(eq(schema.members.status, "ACTIF"), eq(schema.members.category, "ACTIF_MINEUR"))),
    db.select({ n: count() }).from(schema.applications).where(inArray(schema.applications.status, ["SOUMISE", "ENTRETIEN", "VOTE_CA", "AGREEE"])),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(eq(schema.dues.period, period)),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(and(eq(schema.dues.period, period), eq(schema.dues.status, "PAYEE"))),
    db
      .select({ n: sql<number>`count(distinct ${schema.dues.memberId})` })
      .from(schema.dues)
      .where(and(eq(schema.dues.status, "A_PAYER"), sql`${schema.dues.period} < ${period}`)),
    leaderTodos(v),
    db.query.mandates.findMany({
      where: and(eq(schema.mandates.memberId, v.member.id), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, new Date()))),
      orderBy: asc(schema.mandates.startsAt),
      with: { commission: true },
    }),
  ]);
  const kpis = [
    ["Membres actifs", String(members!.n), `dont ${minors!.n} mineurs`],
    ["Candidatures en cours", String(pending!.n), "à traiter"],
    ["Cotisations du mois", formatAriary(Number(paid!.s ?? 0)), `sur ${formatAriary(Number(due!.s ?? 0))} attendus`],
    ["Membres en retard", String(late!.n), "au moins un mois impayé"],
  ];
  const roles = v.roles.filter((r) => DUTIES[r]);

  return (
    <>
      <PageTitle title="Tableau de bord" sub={`${v.member.firstNames} ${v.member.lastName} · ${roles.map((r) => ROLE_LABELS[r]).join(", ")}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([t, val, s]) => (
          <Card key={t}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t}</div>
            <div className="font-display text-3xl font-extrabold">{val}</div>
            <div className="text-sm text-muted">{s}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">À traiter ({todos.length})</h2>
          {todos.length === 0 && <p className="text-muted">Rien en attente pour vous. Bravo !</p>}
          <ul className="flex flex-col gap-3">
            {todos.map((t) => (
              <li key={t.title} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                <div className="flex min-w-0 flex-col">
                  <strong>{t.title}</strong>
                  <span className="text-sm text-muted">{t.ref}</span>
                </div>
                <ButtonLink href={t.href} size="sm">{t.cta}</ButtonLink>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-5">
          {roles.map((r) => (
            <Card key={r} className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">Vos responsabilités</h2>
              <p className="text-sm text-muted">{ROLE_LABELS[r]} · {DUTIES[r as MandateRole]!.ref}</p>
              <ul className="list-disc pl-5 text-[15px]">{DUTIES[r as MandateRole]!.duties.map((d) => <li key={d}>{d}</li>)}</ul>
            </Card>
          ))}
          <Card className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Mandats</h2>
            <ul className="divide-y divide-line text-[15px]">
              {mandates.map((m) => (
                <li key={m.id} className="flex flex-col py-2">
                  <strong>{ROLE_LABELS[m.role]}{m.commission ? ` · ${m.commission.name}` : ""}</strong>
                  <span className="text-sm text-muted">Depuis le {formatDate(m.startsAt)}{m.endsAt ? ` · jusqu'au ${formatDate(m.endsAt)}` : " · sans échéance"}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
