import { notFound } from "next/navigation";
import { asc, db, eq, schema } from "@pride/db";
import { DUREE_MANDAT_COMMISSION, mandateActive } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCommission } from "@/lib/commissions";
import { canManageCommissions, requireDirigeant } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { addCommissionMemberAction, designateResponsableAction, endMandateAction, removeCommissionMemberAction } from "../../actions";

export default async function CommissionDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { slug } = await params;
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const c = await getCommission(slug);
  if (!c) notFound();
  const canManage = canManageCommissions(v);
  const r = c.responsable;
  const actifs = canManage
    ? await db.query.members.findMany({ where: eq(schema.members.status, "ACTIF"), orderBy: [asc(schema.members.lastName), asc(schema.members.firstNames)] })
    : [];
  const memberIds = new Set(c.memberships.map((m) => m.memberId));
  const candidates = actifs.filter((m) => !memberIds.has(m.id));
  const team = [...c.memberships].sort((a, b) => a.member.lastName.localeCompare(b.member.lastName, "fr"));
  const history = [...c.mandates].reverse();

  return (
    <>
      <PageTitle title={`Commission ${c.name}`} sub={c.description}>
        <ButtonLink href="/dirigeants/commissions" variant="outline" size="sm">Toutes les commissions</ButtonLink>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      {!canManage && <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">La désignation des responsables et la composition des commissions sont réservées au conseil d'administration et au Coordonnateur.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Responsable</h2>
          {r ? (
            <div className="flex flex-col gap-1 text-[15px]">
              <strong className="text-lg">{r.member.lastName} {r.member.firstNames}</strong>
              <span className="text-muted">Membre n° {r.member.number} · mandat du {formatDate(r.startsAt)} au {formatDate(r.endsAt)}</span>
              {canManage && (
                <ActionForm action={endMandateAction.bind(null, r.id, c.slug)} className="mt-2 flex flex-col gap-2">
                  <SubmitButton variant="danger" size="sm" className="self-start" pendingLabel="Enregistrement…">Mettre fin au mandat</SubmitButton>
                </ActionForm>
              )}
            </div>
          ) : (
            <Badge tone="yellow" className="self-start text-sm">Aucun responsable en ce moment</Badge>
          )}

          {canManage && (
            <ActionForm action={designateResponsableAction.bind(null, c.id, c.slug)} className="flex flex-col gap-4 border-t border-line pt-4">
              <h3 className="font-bold">{r ? "Désigner un nouveau responsable" : "Désigner le responsable"}</h3>
              <RequiredLegend />
              <Select label="Membre" name="responsableId" required defaultValue="">
                <option value="" disabled>Choisir un membre actif</option>
                {actifs.map((m) => (
                  <option key={m.id} value={m.id}>{m.lastName} {m.firstNames} ({m.number})</option>
                ))}
              </Select>
              <Input label="Début du mandat" name="startsAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}
                hint={`Le mandat dure ${DUREE_MANDAT_COMMISSION} an.${r ? " Le mandat actuel se terminera la veille." : ""}`} />
              <SubmitButton className="self-start">Désigner</SubmitButton>
            </ActionForm>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Membres de la commission <span className="text-muted">({team.length})</span></h2>
          {team.length === 0 && <p className="text-muted">Aucun membre pour l'instant.</p>}
          <ul className="divide-y divide-line">
            {team.map(({ member: m }) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <strong>{m.lastName} {m.firstNames}</strong>
                  <span className="text-sm text-muted"> · {m.number}</span>
                  {r?.memberId === m.id && <Badge tone="dark" className="ml-2">Responsable</Badge>}
                </span>
                {canManage && r?.memberId !== m.id && (
                  <ActionForm action={removeCommissionMemberAction.bind(null, c.id, m.id, c.slug)} className="flex flex-col items-end gap-1">
                    <SubmitButton variant="ghost" size="sm" pendingLabel="Retrait…">Retirer</SubmitButton>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          {canManage && candidates.length > 0 && (
            <ActionForm action={addCommissionMemberAction.bind(null, c.id, c.slug)} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <Select label="Ajouter un membre" name="memberId" required defaultValue="" className="flex-[1_1_260px]">
                <option value="" disabled>Choisir un membre actif</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>{m.lastName} {m.firstNames} ({m.number})</option>
                ))}
              </Select>
              <SubmitButton variant="outline">Ajouter</SubmitButton>
            </ActionForm>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 text-xl font-bold">Historique des responsables</h2>
        {history.length === 0 ? (
          <p className="text-muted">Aucun responsable désigné jusqu'ici.</p>
        ) : (
          <ul className="divide-y divide-line text-[15px]">
            {history.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{m.member.lastName} {m.member.firstNames}</strong> <span className="text-muted">· {m.endsAt && new Date(m.endsAt) < new Date(m.startsAt) ? `désigné le ${formatDate(m.startsAt)}` : `du ${formatDate(m.startsAt)} au ${formatDate(m.endsAt)}`}</span></span>
                {m.endsAt && new Date(m.endsAt) < new Date(m.startsAt) ? <Badge tone="red">Annulé</Badge>
                  : mandateActive(m) ? <Badge>En cours</Badge>
                  : new Date(m.startsAt) > new Date() ? <Badge tone="yellow">À venir</Badge>
                  : <Badge tone="gray">Terminé</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
