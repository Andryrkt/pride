import { desc, db, eq, ne, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PROPOSAL_LABELS, PROPOSAL_STATUS } from "@/lib/network";
import { requireDirigeant } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { decideProposalAction } from "../actions";

/** Propositions d'ateliers et idées de projet envoyées par les membres : réponse « retenue » ou « non retenue », envoyée au membre. */
export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  await requireDirigeant();
  const [pending, done] = await Promise.all([
    db.query.proposals.findMany({ where: eq(schema.proposals.status, "RECUE"), orderBy: desc(schema.proposals.createdAt), with: { member: true } }),
    db.query.proposals.findMany({ where: ne(schema.proposals.status, "RECUE"), orderBy: desc(schema.proposals.decidedAt), with: { member: true }, limit: 30 }),
  ]);
  const author = (m: { lastName: string; firstNames: string; number: string; phone: string | null; email: string | null }) =>
    [`${m.lastName} ${m.firstNames} (${m.number})`, m.phone, m.email].filter(Boolean).join(" · ");

  return (
    <>
      <PageTitle title="Propositions des membres" sub="Ateliers que des membres proposent d'animer et idées de projet. La Commission formation et projets étudie chaque proposition ; un projet est ensuite porté au conseil d'administration." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">À étudier ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">Aucune proposition en attente.</p>}
        {pending.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{PROPOSAL_LABELS[p.kind]}</Badge>
              <span className="text-sm text-muted">Reçue le {formatDate(p.createdAt)} de {author(p.member)}</span>
            </div>
            <h3 className="text-lg font-bold">{p.title}</h3>
            <p className="whitespace-pre-line">{p.details}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionForm action={decideProposalAction.bind(null, p.id, "RETENUE")} className="flex flex-col gap-2">
                <Input label="Message au membre (facultatif)" name="note" id={`note-ok-${p.id}`} hint="Ex. : la commission vous appelle cette semaine." />
                <SubmitButton className="self-start">Retenir</SubmitButton>
              </ActionForm>
              <ActionForm action={decideProposalAction.bind(null, p.id, "NON_RETENUE")} className="flex flex-col gap-2">
                <Input label="Pourquoi ?" name="note" id={`note-ko-${p.id}`} required />
                <SubmitButton variant="outline" className="self-start">Ne pas retenir</SubmitButton>
              </ActionForm>
            </div>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Déjà traitées</h2>
        {done.length === 0 && <p className="text-muted">Aucune proposition traitée.</p>}
        <ul className="divide-y divide-line">
          {done.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-muted">
                  {PROPOSAL_LABELS[p.kind]} · {p.member.lastName} {p.member.firstNames}{p.decidedAt ? ` · répondu le ${formatDate(p.decidedAt)}` : ""}
                  {p.decisionNote ? ` · « ${p.decisionNote} »` : ""}
                </div>
              </div>
              <Badge tone={PROPOSAL_STATUS[p.status][1]}>{PROPOSAL_STATUS[p.status][0]}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
