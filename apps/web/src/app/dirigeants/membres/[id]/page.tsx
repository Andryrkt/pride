import { notFound } from "next/navigation";
import { asc, db, desc, eq, schema } from "@pride/db";
import { ROLE_LABELS, TARIFS, type MandateRole, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MEMBER_STATUS } from "@/lib/labels";
import { canDecideApplications, requireDirigeant } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import { decideExclusionAction, departureAction, openExclusionAction } from "../../actions";

const today = () => new Date().toISOString().slice(0, 10);

export default async function MemberRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const m = await db.query.members.findFirst({
    where: eq(schema.members.id, id),
    with: { mandates: { orderBy: desc(schema.mandates.startsAt), with: { commission: true } } },
  });
  if (!m) notFound();
  const procedures = await db.query.exclusionProcedures.findMany({ where: eq(schema.exclusionProcedures.memberId, id), orderBy: asc(schema.exclusionProcedures.createdAt) });
  const open = procedures.find((p) => p.status === "OUVERTE");
  const canManage = canDecideApplications(v) && m.status === "ACTIF";
  const [label, tone] = MEMBER_STATUS[m.status];
  const isSelf = m.id === v.member.id;

  return (
    <>
      <PageTitle title={`${m.lastName} ${m.firstNames}`} sub={`N° ${m.number} · ${TARIFS[m.category as MemberCategory].label} depuis le ${formatDate(m.joinedAt)}`}>
        <div className="flex items-center gap-3">
          <Badge tone={tone} className="text-sm">{label}</Badge>
          <ButtonLink href="/dirigeants/membres" variant="outline" size="sm">Registre</ButtonLink>
        </div>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-1.5 text-[15px]">
          <h2 className="mb-1 text-xl font-bold">Fiche</h2>
          <p><span className="text-muted">Téléphone : </span>{m.phone ?? "—"}</p>
          <p><span className="text-muted">E-mail : </span>{m.email ?? "—"}</p>
          <p><span className="text-muted">Quartier / ville : </span>{m.address ?? "—"}</p>
          {m.status !== "ACTIF" && (
            <p className="mt-2 rounded-xl bg-paper px-4 py-3">
              {label} le {formatDate(m.statusChangedAt)}{m.statusNote ? ` · ${m.statusNote}` : ""}
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Mandats</h2>
          {m.mandates.length === 0 && <p className="text-muted">Aucun mandat.</p>}
          <ul className="divide-y divide-line text-[15px]">
            {m.mandates.map((x) => (
              <li key={x.id} className="py-2">
                <strong>{ROLE_LABELS[x.role as MandateRole]}{x.commission ? ` · ${x.commission.name}` : ""}</strong>
                <span className="text-muted"> · du {formatDate(x.startsAt)} {x.endsAt ? `au ${formatDate(x.endsAt)}` : "(sans fin)"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {procedures.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Procédures d'exclusion</h2>
          {procedures.map((p) => (
            <div key={p.id} className="flex flex-col gap-1 rounded-xl border border-line p-4 text-[15px]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={p.status === "OUVERTE" ? "yellow" : p.status === "ADOPTEE" ? "red" : "gray"}>
                  {p.status === "OUVERTE" ? "En cours" : p.status === "ADOPTEE" ? "Exclusion prononcée" : "Exclusion non retenue"}
                </Badge>
                <span className="text-muted">Ouverte le {formatDate(p.createdAt)} · audition le {formatDateTime(p.hearingAt)}</span>
              </div>
              <p><span className="text-muted">Motif : </span>{p.reason}</p>
              {p.meetingDate && (
                <p><span className="text-muted">Délibération du CA du {formatDate(p.meetingDate)} : </span>{p.votesFor} pour, {p.votesAgainst} contre, {p.presents} présents</p>
              )}
              {p.defense && <p><span className="text-muted">Défense du membre : </span>{p.defense}</p>}
            </div>
          ))}
        </Card>
      )}

      {canManage && !isSelf && (
        <div className="grid gap-5 lg:grid-cols-2">
          {open ? (
            <Card className="flex flex-col gap-3 border-flame-600/40">
              <h2 className="text-xl font-bold">Délibération du conseil d'administration</h2>
              <p className="text-[15px] text-muted">Après l'audition du {formatDateTime(open.hearingAt)}. L'exclusion demande les <strong>deux tiers des membres du CA présents</strong>.</p>
              <ActionForm action={decideExclusionAction.bind(null, open.id, m.id)}>
                <RequiredLegend />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Date de la réunion" name="meetingDate" type="date" required defaultValue={today()} />
                  <Input label="Membres du CA présents" name="presents" type="number" min={1} max={7} required />
                  <Input label="Pour l'exclusion" name="pour" type="number" min={0} max={7} required />
                  <Input label="Contre" name="contre" type="number" min={0} max={7} required />
                </div>
                <Textarea label="Défense présentée par le membre" name="defense" rows={3} hint="Résumé de sa défense écrite ou orale, ou « aucune défense présentée »." />
                <label className="flex items-start gap-3 text-[15px]">
                  <input type="checkbox" name="heard" required className="mt-1 size-5" />
                  <span>Le membre a été informé du motif et a pu présenter sa défense. <span className="text-flame-600">*</span></span>
                </label>
                <SubmitButton variant="danger" className="self-start">Enregistrer la délibération</SubmitButton>
              </ActionForm>
            </Card>
          ) : (
            <Card className="flex flex-col gap-3">
              <h2 className="text-xl font-bold">Ouvrir une procédure d'exclusion</h2>
              <p className="text-[15px] text-muted">Règlement intérieur, art. 2 : le membre est informé du motif et peut se défendre avant la décision du conseil d'administration.</p>
              <ActionForm action={openExclusionAction.bind(null, m.id)}>
                <RequiredLegend />
                <Textarea label="Motif" name="reason" required rows={3} />
                <Input label="Date de l'audition" name="hearingAt" type="datetime-local" required hint="Le membre reçoit le motif et cette date par e-mail." />
                <SubmitButton variant="danger" className="self-start">Ouvrir la procédure</SubmitButton>
              </ActionForm>
            </Card>
          )}
          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Démission ou décès</h2>
            <ActionForm action={departureAction.bind(null, m.id, "DEMISSIONNAIRE")} className="flex flex-col gap-2">
              <Input label="Date de la démission" name="date" id="date-dem" type="date" required defaultValue={today()} />
              <Input label="Note" name="note" id="note-dem" placeholder="Ex. : lettre reçue le…" />
              <SubmitButton variant="outline" className="self-start">Enregistrer la démission</SubmitButton>
            </ActionForm>
            <ActionForm action={departureAction.bind(null, m.id, "DECEDE")} className="flex flex-col gap-2 border-t border-line pt-4">
              <Input label="Date du décès" name="date" id="date-dec" type="date" required />
              <Input label="Note" name="note" id="note-dec" />
              <SubmitButton variant="outline" className="self-start">Enregistrer le décès</SubmitButton>
            </ActionForm>
            <p className="text-sm text-muted">Dans tous les cas, la carte devient invalide, les mandats et les commissions prennent fin, et l'espace membre est fermé.</p>
          </Card>
        </div>
      )}
      {canManage && isSelf && <p className="rounded-xl bg-paper px-4 py-3 text-muted">Ces actions ne s'appliquent pas à votre propre fiche : un autre dirigeant doit les faire.</p>}
    </>
  );
}
