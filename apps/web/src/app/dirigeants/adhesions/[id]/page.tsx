import { notFound } from "next/navigation";
import { db, eq, schema } from "@pride/db";
import { ageOn, DOCUMENT_KINDS, entryFee, monthlyFee, formatAriary, type DocumentKind } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { APPLICATION_STATUS } from "@/lib/labels";
import { canDecideApplications, requireDirigeant } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import { createMemberAction, decisionAction, interviewAction, sendToVoteAction } from "../../actions";

const STEPS = ["Dossier reçu", "Parrainage ou entretien", "Vote du CA", "Fiche membre"];
const stepIndex: Record<string, number> = { SOUMISE: 1, ENTRETIEN: 1, VOTE_CA: 2, AGREEE: 3, REFUSEE: 2, MEMBRE: 4 };

export default async function ApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const a = await db.query.applications.findFirst({ where: eq(schema.applications.id, id), with: { sponsor: true, documents: true, member: true } });
  if (!a) notFound();
  const canDecide = canDecideApplications(v);
  const [label, tone] = APPLICATION_STATUS[a.status]!;
  const idx = stepIndex[a.status]!;

  return (
    <>
      <PageTitle title={`${a.lastName} ${a.firstNames}`} sub={`Dossier ${a.reference} · déposé le ${formatDate(a.createdAt)}`}>
        <Badge tone={tone} className="text-sm">{label}</Badge>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <ol className="grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${i < idx ? "bg-brand-50 text-brand-800" : i === idx ? "bg-brand-800 text-white" : "bg-[#ecefea] text-muted"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-2 text-[15px]">
          <h2 className="mb-1 text-xl font-bold">Fiche de renseignement</h2>
          <p><span className="text-muted">Naissance : </span>{formatDate(a.birthDate)} ({ageOn(new Date(a.birthDate))} ans)</p>
          <p><span className="text-muted">Téléphone : </span>{a.phone}</p>
          <p><span className="text-muted">E-mail : </span>{a.email ?? "—"}</p>
          <p><span className="text-muted">Adresse : </span>{a.address}</p>
          <p><span className="text-muted">Profession : </span>{a.profession ?? "—"}</p>
          <p><span className="text-muted">Compétences : </span>{a.skills ?? "—"}</p>
          <p><span className="text-muted">Catégorie : </span>{a.category === "ACTIF_MINEUR" ? "Membre actif mineur" : a.category === "BIENFAITEUR" ? "Bienfaiteur" : "Membre actif"} ({formatAriary(entryFee(a.category))} puis {formatAriary(monthlyFee(a.category))} / mois)</p>
          {a.parentName && <p><span className="text-muted">Parent membre : </span>{a.parentName} ({a.parentMemberNumber})</p>}
          <p><span className="text-muted">Parrainage : </span>{a.sponsor ? `${a.sponsor.lastName} ${a.sponsor.firstNames}` : `Entretien${a.interviewAt ? ` le ${formatDateTime(a.interviewAt)}` : " à planifier"}`}</p>
          {a.expectations && <p className="mt-2 rounded-xl bg-paper p-3">« {a.expectations} »</p>}
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="mb-1 text-xl font-bold">Pièces jointes</h2>
          {a.documents.map((d) => (
            <a key={d.id} href={`/api/fichiers/${d.id}`} target="_blank" className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:border-brand-600">
              <span><strong>{DOCUMENT_KINDS[d.kind as DocumentKind]}</strong><br /><span className="text-sm text-muted">{d.filename} · {Math.round(d.size / 1024)} Ko</span></span>
              <span className="text-sm font-semibold text-brand-600">Ouvrir</span>
            </a>
          ))}
        </Card>
      </div>

      {!canDecide && <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">Les décisions sont réservées au conseil d'administration et au Secrétariat général.</p>}

      {canDecide && (a.status === "SOUMISE" || a.status === "ENTRETIEN") && (
        <Card className="flex flex-col gap-5">
          {a.sponsorship === "ENTRETIEN" && (
            <ActionForm action={interviewAction.bind(null, a.id)} className="flex flex-wrap items-end gap-3">
              <Input label="Date de l'entretien (2 membres du CA)" name="interviewAt" type="datetime-local" required className="flex-[1_1_260px]" />
              <SubmitButton variant="outline">Planifier l'entretien</SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={sendToVoteAction.bind(null, a.id)}>
            <p className="text-muted">{a.sponsorship === "PARRAIN" ? "Parrainage à confirmer avec le parrain, puis inscription au vote du conseil." : "Après l'entretien, inscrivez la candidature au vote du conseil."}</p>
            <SubmitButton className="self-start">Soumettre au vote du CA</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {canDecide && a.status === "VOTE_CA" && (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Délibération du conseil d'administration</h2>
          <p className="mb-4 text-muted">Agrément à la majorité des membres présents.</p>
          <ActionForm action={decisionAction.bind(null, a.id)}>
            <div className="grid gap-4 sm:grid-cols-4">
              <Input label="Date de la réunion" name="meetingDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <Input label="Membres présents" name="presents" type="number" min={1} max={7} required defaultValue={5} />
              <Input label="Voix pour" name="pour" type="number" min={0} max={7} required />
              <Input label="Voix contre" name="contre" type="number" min={0} max={7} required defaultValue={0} />
            </div>
            <SubmitButton className="self-start">Enregistrer la décision</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {a.decidedAt && (
        <Card className="text-[15px]">
          Décision du {formatDate(a.meetingDate)} : {a.votesFor} voix pour, {a.votesAgainst} contre, {a.presents} membres présents.
        </Card>
      )}

      {canDecide && a.status === "AGREEE" && (
        <Card>
          <ActionForm action={createMemberAction.bind(null, a.id)}>
            <p>Créer la fiche membre : numéro attribué, droit d'entrée ({formatAriary(entryFee(a.category))}) et première cotisation à payer{a.email ? ", et envoi d'un lien pour choisir le mot de passe de l'espace membre" : ""}.</p>
            <SubmitButton className="self-start">Créer la fiche membre</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {a.member && <Card>Membre n° <strong>{a.member.number}</strong> créé.</Card>}
    </>
  );
}
