import Link from "next/link";
import { and, asc, db, eq, ne, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { askHelpAction, requestCommissionAction } from "../actions";
import { OneClick, ProposalForm } from "../network-forms";

const norm = (s: string) => s.toLocaleLowerCase("fr");

export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ competence?: string }> }) {
  const { member } = await requireMember();
  const filter = (await searchParams).competence ?? "";
  const [people, asked, commissions, memberships, requests] = await Promise.all([
    db.query.members.findMany({
      where: and(eq(schema.members.status, "ACTIF"), eq(schema.members.shareSkills, true), ne(schema.members.id, member.id)),
      orderBy: asc(schema.members.firstNames),
    }),
    db.query.helpRequests.findMany({ where: eq(schema.helpRequests.fromId, member.id) }),
    db.query.commissions.findMany({ orderBy: asc(schema.commissions.name) }),
    db.query.commissionMemberships.findMany({ where: eq(schema.commissionMemberships.memberId, member.id) }),
    db.query.commissionRequests.findMany({ where: and(eq(schema.commissionRequests.memberId, member.id), eq(schema.commissionRequests.status, "DEMANDEE")) }),
  ]);
  const withSkills = people.filter((p) => p.skills.length > 0);

  // Filtres : les compétences les plus partagées dans l'annuaire
  const tally = new Map<string, { label: string; n: number }>();
  for (const s of withSkills.flatMap((p) => p.skills)) {
    const t = tally.get(norm(s)) ?? { label: s, n: 0 };
    tally.set(norm(s), { label: t.label, n: t.n + 1 });
  }
  const top = [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 8).map((t) => t.label);
  const shown = filter ? withSkills.filter((p) => p.skills.some((s) => norm(s) === norm(filter))) : withSkills;
  const askedIds = new Set(asked.map((a) => a.toId));
  const inCommission = new Set(memberships.map((m) => m.commissionId));
  const pending = new Set(requests.map((r) => r.commissionId));

  return (
    <>
      <PageTitle title="Compétences et commissions" sub="Le trait d'union entre ceux qui veulent aider et ceux qui en ont besoin." />

      <Card className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-col gap-2">
          <strong>Mes compétences partagées</strong>
          {member.skills.length ? (
            <div className="flex flex-wrap gap-2">{member.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          ) : (
            <span className="text-muted">Aucune compétence renseignée.</span>
          )}
          <span className="text-sm text-muted">
            {member.shareSkills ? "Vous apparaissez dans l'annuaire des compétences." : "Vous n'apparaissez pas dans l'annuaire : activez-le dans votre profil pour que d'autres membres puissent vous solliciter."}
          </span>
        </div>
        <ButtonLink href="/membre/profil" variant="outline">Modifier mes compétences</ButtonLink>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-[22px] font-bold">Annuaire des compétences</h2>
        {top.length > 0 && (
          <nav aria-label="Filtrer par compétence" className="flex flex-wrap gap-2">
            {["", ...top].map((s) => (
              <Link
                key={s || "tous"}
                href={s ? `/membre/competences?competence=${encodeURIComponent(s)}` : "/membre/competences"}
                aria-current={norm(filter) === norm(s) ? "page" : undefined}
                className={cn("inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-[1.5px] ring-inset", norm(filter) === norm(s) ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5] hover:ring-brand-600")}
              >
                {s || "Tous"}
              </Link>
            ))}
          </nav>
        )}
        {shown.length === 0 ? (
          <p className="text-muted">Personne dans l'annuaire pour le moment. Chaque membre choisit d'y apparaître depuis son profil.</p>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-800" aria-hidden>
                    {(p.firstNames[0] ?? "") + (p.lastName[0] ?? "")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold">{p.firstNames.split(" ")[0]} {p.lastName[0]}.</div>
                    {p.profession && <div className="text-sm text-muted">{p.profession}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                {askedIds.has(p.id) ? (
                  <span className="inline-flex min-h-10 items-center self-start rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-800">Demande envoyée ✓</span>
                ) : (
                  <OneClick action={askHelpAction.bind(null, p.id)} label="Demander un coup de main" doneLabel="Demande envoyée ✓" size="sm" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-[22px] font-bold">Commissions de travail</h2>
          <p className="text-[15px] text-muted">Rejoignez une commission selon vos compétences et vos envies. Votre demande est acceptée par le conseil d'administration ou le Coordonnateur.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {commissions.map((c) => (
            <div key={c.id} className="flex flex-col justify-between gap-2.5 rounded-2xl bg-paper p-4">
              <div>
                <div className="font-bold">{c.name}</div>
                <div className="text-sm text-muted">{c.description}</div>
              </div>
              {inCommission.has(c.id) ? (
                <span className="inline-flex min-h-10 items-center self-start rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-800">Membre ✓</span>
              ) : pending.has(c.id) ? (
                <span className="inline-flex min-h-10 items-center self-start rounded-full bg-sun-50 px-4 text-sm font-semibold text-sun-800">Demande en attente</span>
              ) : (
                <OneClick action={requestCommissionAction.bind(null, c.id)} label="Rejoindre" doneLabel="Demande en attente" size="sm" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3.5">
        <h2 className="text-[22px] font-bold">Proposer une idée de projet</h2>
        <ProposalForm kind="PROJET" />
      </Card>
    </>
  );
}
