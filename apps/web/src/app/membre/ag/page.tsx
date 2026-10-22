import Link from "next/link";
import { and, db, desc, eq, schema } from "@pride/db";
import { canVoteAtAG } from "@pride/shared";
import { ConsultationResults } from "@/components/ag/consultation-results";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { ASSEMBLY_STATUS, KIND_LABELS, listAssemblies } from "@/lib/assemblies";
import { requireMember } from "@/lib/session";
import { consultationResults } from "@/lib/consultations";
import { formatDateTime } from "@/lib/utils";
import { ConsultationVote } from "./consultation-vote";

export default async function MemberAssembliesPage() {
  const { member } = await requireMember();
  // Les AG en préparation ne sont visibles que des dirigeants.
  const assemblies = await listAssemblies(["CONVOQUEE", "EN_SEANCE", "CLOTUREE", "CARENCE"]);
  const votes = canVoteAtAG(member);
  const consultations = await Promise.all(
    (await db.query.consultations.findMany({ orderBy: desc(schema.consultations.closesAt), limit: 5 })).map(async (c) => ({
      ...c,
      open: c.closesAt > new Date(),
      voted: !!(await db.query.consultationVoters.findFirst({ where: and(eq(schema.consultationVoters.consultationId, c.id), eq(schema.consultationVoters.memberId, member.id)) })),
      results: await consultationResults(c),
    })),
  );
  return (
    <>
      <PageTitle title="Assemblées générales" sub="Convocations et procès-verbaux" />
      <p className={votes ? "rounded-xl bg-brand-50 px-4 py-3 text-brand-800" : "rounded-xl bg-paper px-4 py-3"}>
        {votes
          ? "Vous avez le droit de vote à l'AG. Votre présence compte pour le quorum : les procurations ne sont pas admises."
          : "Vous pouvez assister aux AG, mais seuls les membres actifs majeurs votent."}
      </p>
      <Card className="p-0">
        {assemblies.length === 0 ? (
          <p className="p-6 text-muted">Aucune assemblée générale pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {assemblies.map((a) => {
              const [label, tone] = ASSEMBLY_STATUS[a.status];
              return (
                <li key={a.id}>
                  <Link href={`/membre/ag/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-paper">
                    <span className="flex flex-col">
                      <strong>{a.title}</strong>
                      <span className="text-sm text-muted">{KIND_LABELS[a.kind]} · {formatDateTime(a.scheduledAt)} · {a.location}</span>
                    </span>
                    <Badge tone={tone}>{a.status === "CLOTUREE" || a.status === "CARENCE" ? "PV disponible" : label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {consultations.map((c, i) => (
        <Card key={c.id} id={i === 0 ? "consultations" : undefined} className="flex scroll-mt-4 flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <div>
              <div className="text-xs font-bold tracking-[0.14em] text-brand-600 uppercase">
                Consultation en ligne · {c.open ? `clôture le ${formatDateTime(c.closesAt)}` : `close le ${formatDateTime(c.closesAt)}`}
              </div>
              <h2 className="text-2xl font-bold">{c.question}</h2>
            </div>
            <span className="text-sm text-muted">Vote anonyme · avis consultatif</span>
          </div>
          {c.open && !c.voted && votes ? (
            <ConsultationVote id={c.id} options={c.options} />
          ) : (
            <>
              {c.voted && <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-800">Merci, votre vote est enregistré.{c.open ? " Résultats provisoires :" : ""}</p>}
              {!c.voted && c.open && <p className="rounded-xl bg-paper px-4 py-3">Seuls les membres actifs majeurs votent. Résultats provisoires :</p>}
              <ConsultationResults {...c.results} />
            </>
          )}
        </Card>
      ))}
      {consultations.length > 0 && (
        <p className="text-sm text-muted">
          Les consultations recueillent l'avis des membres. Les décisions de l'association restent votées en assemblée générale, par les membres présents.
        </p>
      )}
    </>
  );
}
