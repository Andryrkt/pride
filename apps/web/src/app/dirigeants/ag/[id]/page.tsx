import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, db, eq, gte, inArray, isNull, or, schema } from "@pride/db";
import { AG_DELAI_CONVOCATION_JOURS, canVoteAtAG, convocationDelay, MAJORITES } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ASSEMBLY_STATUS, eligibleVoters, getAssembly, KIND_LABELS } from "@/lib/assemblies";
import { canManageAssemblies, requireDirigeant } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  addResolutionAction,
  carenceAction,
  closeSessionAction,
  convokeAction,
  openSessionAction,
  removeAttendanceAction,
  removeResolutionAction,
  secondConvocationAction,
  signAttendanceAction,
  updateAssemblyAction,
  voteAction,
} from "../actions";

const STEPS = ["Préparation", "Convocation", "Séance", "Procès-verbal"];
const stepIndex = { PREPARATION: 0, CONVOQUEE: 1, EN_SEANCE: 2, CLOTUREE: 3, CARENCE: 3 } as const;

const localInput = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}T${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
};

export default async function AssemblyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const a = await getAssembly(id);
  if (!a) notFound();
  const canManage = canManageAssemblies(v);
  const [label, tone] = ASSEMBLY_STATUS[a.status];
  const idx = stepIndex[a.status];
  const editable = a.status === "PREPARATION" || a.status === "CONVOQUEE";

  const actifs =
    canManage && (a.status === "CONVOQUEE" || a.status === "EN_SEANCE")
      ? await db.query.members.findMany({ where: eq(schema.members.status, "ACTIF"), orderBy: [asc(schema.members.lastName), asc(schema.members.firstNames)] })
      : [];
  const officers =
    a.status === "CONVOQUEE"
      ? await db.query.mandates.findMany({
          where: and(inArray(schema.mandates.role, ["PRESIDENT", "SECRETAIRE_GENERALE"]), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, new Date()))),
        })
      : [];
  const signed = new Set(a.attendances.map((x) => x.memberId));
  const toSign = actifs.filter((m) => !signed.has(m.id));
  const eligibleNow = a.status === "PREPARATION" ? (await eligibleVoters()).length : 0;
  const delayNow = convocationDelay(new Date(), new Date(a.scheduledAt));

  return (
    <>
      <PageTitle title={a.title} sub={`${a.reference} · ${KIND_LABELS[a.kind]}${a.convocationNumber >= 2 ? " · deuxième convocation" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone} className="text-sm">{label}</Badge>
          <ButtonLink href={`/dirigeants/ag/${a.id}/pv`} variant="outline" size="sm">{a.status === "CLOTUREE" || a.status === "CARENCE" ? "Procès-verbal" : "Projet de PV"}</ButtonLink>
        </div>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      {!canManage && <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">La tenue des AG est réservée au conseil d'administration et au Secrétariat général.</p>}
      {a.previous && (
        <p className="rounded-xl bg-paper px-4 py-3 text-[15px]">
          Deuxième convocation après la carence de <Link className="font-semibold text-brand-600 underline" href={`/dirigeants/ag/${a.previous.id}`}>{a.previous.reference}</Link> : l'assemblée délibère sans condition de quorum.
        </p>
      )}

      <ol className="grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${i < idx ? "bg-brand-50 text-brand-800" : i === idx ? "bg-brand-800 text-white" : "bg-[#ecefea] text-muted"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {a.status === "EN_SEANCE" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className={a.canDeliberate ? "flex flex-col gap-3 border-brand-600" : "flex flex-col gap-3 border-flame-600"}>
            <h2 className="text-xl font-bold">Quorum</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["Droit de vote", a.eligibleVoters], [a.convocationNumber >= 2 ? "Quorum" : "Quorum requis", a.convocationNumber >= 2 ? "aucun" : a.quorum], ["Votants présents", a.presentVoters]].map(([t, n]) => (
                <div key={t as string} className="rounded-xl bg-paper p-3">
                  <div className="font-display text-3xl font-extrabold">{n}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">{t}</div>
                </div>
              ))}
            </div>
            <p className={a.canDeliberate ? "font-semibold text-brand-800" : "font-semibold text-flame-800"}>
              {a.convocationNumber >= 2
                ? "Deuxième convocation : l'assemblée délibère quel que soit le nombre de présents."
                : a.canDeliberate
                  ? "Quorum atteint : l'assemblée peut voter."
                  : `Il manque ${(a.quorum ?? 0) - a.presentVoters} votant(s) pour atteindre le quorum.`}
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Émargement <span className="text-muted">({a.attendances.length})</span></h2>
            {canManage && toSign.length > 0 && (
              <ActionForm action={signAttendanceAction.bind(null, a.id)} className="flex flex-wrap items-end gap-3">
                <Select label="Membre présent" name="memberId" required defaultValue="" className="flex-[1_1_240px]">
                  <option value="" disabled>Choisir un membre</option>
                  {toSign.map((m) => <option key={m.id} value={m.id}>{m.lastName} {m.firstNames} ({m.number}){canVoteAtAG(m) ? "" : " · sans droit de vote"}</option>)}
                </Select>
                <SubmitButton variant="outline">Émarger</SubmitButton>
              </ActionForm>
            )}
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {a.attendances.map((x) => (
                <li key={x.memberId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{x.member.lastName} {x.member.firstNames}</strong>
                    {!x.canVote && <Badge tone="gray" className="ml-2">Sans droit de vote</Badge>}
                  </span>
                  {canManage && (
                    <ActionForm action={removeAttendanceAction.bind(null, a.id, x.memberId)} className="flex flex-col items-end gap-1">
                      <SubmitButton variant="ghost" size="sm" pendingLabel="Retrait…">Retirer</SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-2 text-[15px]">
          <h2 className="mb-1 text-xl font-bold">Réunion</h2>
          <p><span className="text-muted">Date : </span>{formatDateTime(a.scheduledAt)}</p>
          <p><span className="text-muted">Lieu : </span>{a.location}</p>
          {a.convokedAt && <p><span className="text-muted">Convocation : </span>envoyée le {formatDate(a.convokedAt)} ({a.convocationsSent ?? 0} e-mail(s), {convocationDelay(new Date(a.convokedAt), new Date(a.scheduledAt)).days} jours avant)</p>}
          <h3 className="mt-2 font-bold">Ordre du jour</h3>
          <p className="whitespace-pre-line rounded-xl bg-paper p-3">{a.agenda}</p>
          {canManage && a.status === "PREPARATION" && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-brand-600">Modifier la réunion</summary>
              <ActionForm action={updateAssemblyAction.bind(null, a.id)} className="mt-3 flex flex-col gap-4">
                <RequiredLegend />
                <Select label="Type" name="kind" required defaultValue={a.kind}>
                  <option value="ORDINAIRE">{KIND_LABELS.ORDINAIRE}</option>
                  <option value="EXTRAORDINAIRE">{KIND_LABELS.EXTRAORDINAIRE}</option>
                </Select>
                <Input label="Intitulé" name="title" required defaultValue={a.title} />
                <Input label="Date et heure" name="scheduledAt" type="datetime-local" required defaultValue={localInput(a.scheduledAt)} />
                <Input label="Lieu" name="location" required defaultValue={a.location} />
                <Textarea label="Ordre du jour" name="agenda" required defaultValue={a.agenda} rows={6} />
                <SubmitButton variant="outline" className="self-start">Enregistrer</SubmitButton>
              </ActionForm>
            </details>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Résolutions <span className="text-muted">({a.resolutions.length})</span></h2>
          {a.resolutions.length === 0 && <p className="text-muted">Aucune résolution soumise au vote.</p>}
          <ul className="flex flex-col gap-3">
            {a.resolutions.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong>{r.position}. {r.title}</strong>
                  {r.adopted !== null && <Badge tone={r.adopted ? "green" : "red"}>{r.adopted ? "Adoptée" : "Rejetée"}</Badge>}
                </div>
                <p className="whitespace-pre-line text-[15px]">{r.text}</p>
                <p className="text-sm text-muted">{MAJORITES[r.majority].label} : {MAJORITES[r.majority].detail}</p>
                {r.adopted !== null && <p className="text-sm">Pour {r.votesFor} · contre {r.votesAgainst} · abstentions {r.abstentions} · {r.voters} votant(s) présent(s)</p>}
                {canManage && editable && (
                  <ActionForm action={removeResolutionAction.bind(null, r.id, a.id)} className="mt-2 flex flex-col items-start gap-1">
                    <SubmitButton variant="ghost" size="sm" pendingLabel="Retrait…">Retirer</SubmitButton>
                  </ActionForm>
                )}
                {canManage && a.status === "EN_SEANCE" && (
                  <ActionForm action={voteAction.bind(null, r.id, a.id)} className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="Pour" name="pour" id={`pour-${r.position}`} type="number" min={0} required defaultValue={r.votesFor ?? undefined} />
                      <Input label="Contre" name="contre" id={`contre-${r.position}`} type="number" min={0} required defaultValue={r.votesAgainst ?? 0} />
                      <Input label="Abstentions" name="abstention" id={`abstention-${r.position}`} type="number" min={0} required defaultValue={r.abstentions ?? 0} />
                    </div>
                    <SubmitButton size="sm" className="self-start" disabled={!a.canDeliberate}>{r.adopted === null ? "Enregistrer le vote" : "Corriger le vote"}</SubmitButton>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          {canManage && editable && (
            <details className="border-t border-line pt-3" open={a.resolutions.length === 0}>
              <summary className="cursor-pointer font-semibold text-brand-600">Ajouter une résolution</summary>
              <ActionForm action={addResolutionAction.bind(null, a.id)} className="mt-3 flex flex-col gap-4">
                <RequiredLegend />
                <Input label="Intitulé" name="title" id="resolution-title" required placeholder="Approbation du rapport financier" />
                <Textarea label="Texte soumis au vote" name="text" id="resolution-text" required rows={3} placeholder="L'assemblée générale approuve…" />
                <Select label="Majorité requise" name="majority" id="resolution-majority" required defaultValue="SIMPLE">
                  {Object.entries(MAJORITES).map(([k, m]) => <option key={k} value={k}>{m.label} ({m.detail})</option>)}
                </Select>
                <SubmitButton variant="outline" className="self-start">Ajouter</SubmitButton>
              </ActionForm>
            </details>
          )}
        </Card>
      </div>

      {canManage && a.status === "PREPARATION" && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Envoyer la convocation</h2>
          <p className="text-[15px]">
            La convocation part par e-mail à tous les membres actifs et apparaît dans leur espace. {eligibleNow} membre(s) ont aujourd'hui le droit de vote
            {a.convocationNumber < 2 ? `, le quorum serait donc de ${Math.floor(eligibleNow / 2) + 1}` : ""}.
          </p>
          {delayNow.late && (
            <p className="rounded-xl bg-flame-50 px-4 py-3 font-semibold text-flame-800">
              {delayNow.days < 0 ? "La date de la réunion est passée." : `La réunion a lieu dans ${delayNow.days} jour(s) : les statuts demandent ${AG_DELAI_CONVOCATION_JOURS} jours.`}
            </p>
          )}
          <ActionForm action={convokeAction.bind(null, a.id)}>
            <SubmitButton className="self-start" pendingLabel="Envoi des convocations…">Envoyer la convocation</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {canManage && a.status === "CONVOQUEE" && (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Ouvrir la séance</h2>
          <p className="mb-4 text-muted">À l'ouverture, le nombre de membres ayant le droit de vote et le quorum sont figés pour le procès-verbal.</p>
          <ActionForm action={openSessionAction.bind(null, a.id)}>
            <RequiredLegend />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Président de séance" name="presidentId" required defaultValue={officers.find((o) => o.role === "PRESIDENT")?.memberId ?? ""}>
                <option value="" disabled>Choisir un membre</option>
                {actifs.map((m) => <option key={m.id} value={m.id}>{m.lastName} {m.firstNames}</option>)}
              </Select>
              <Select label="Secrétaire de séance" name="secretaryId" required defaultValue={officers.find((o) => o.role === "SECRETAIRE_GENERALE")?.memberId ?? ""}>
                <option value="" disabled>Choisir un membre</option>
                {actifs.map((m) => <option key={m.id} value={m.id}>{m.lastName} {m.firstNames}</option>)}
              </Select>
            </div>
            <SubmitButton className="self-start">Ouvrir la séance</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {canManage && a.status === "EN_SEANCE" && (a.canDeliberate ? (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Clôturer la séance</h2>
          <p className="mb-4 text-muted">Toutes les résolutions doivent être votées. Après la clôture, le procès-verbal, les votes et l'émargement ne peuvent plus être modifiés.</p>
          <ActionForm action={closeSessionAction.bind(null, a.id)}>
            <Textarea label="Observations pour le procès-verbal" name="notes" rows={3} hint="Facultatif : questions diverses, interventions notables…" />
            <SubmitButton className="self-start">Clôturer et établir le PV</SubmitButton>
          </ActionForm>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Quorum non atteint ?</h2>
          <p className="mb-4 text-muted">Si les membres présents ne suffisent pas, constatez la carence : un procès-verbal de carence est établi et une deuxième AG, sans condition de quorum, peut être convoquée.</p>
          <ActionForm action={carenceAction.bind(null, a.id)}>
            <Textarea label="Observations" name="notes" rows={2} />
            <SubmitButton variant="danger" className="self-start">Constater la carence</SubmitButton>
          </ActionForm>
        </Card>
      ))}

      {a.status === "CARENCE" && (
        <Card>
          <h2 className="mb-1 text-xl font-bold">Deuxième convocation</h2>
          {a.next ? (
            <p>Deuxième AG : <Link className="font-semibold text-brand-600 underline" href={`/dirigeants/ag/${a.next.id}`}>{a.next.reference}</Link>, le {formatDateTime(a.next.scheduledAt)}.</p>
          ) : canManage ? (
            <ActionForm action={secondConvocationAction.bind(null, a.id)} className="flex flex-wrap items-end gap-3">
              <Input label="Date et heure de la deuxième AG" name="scheduledAt" type="datetime-local" required className="flex-[1_1_260px]"
                hint={`Même ordre du jour et mêmes résolutions. Convocation ${AG_DELAI_CONVOCATION_JOURS} jours avant.`} />
              <SubmitButton>Préparer la deuxième AG</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-muted">Pas encore de deuxième AG.</p>
          )}
        </Card>
      )}
    </>
  );
}
