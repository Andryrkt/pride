import { Paperclip } from "lucide-react";
import { desc, db, schema } from "@pride/db";
import { formatAriary, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { canHandleSolidarity, requireDirigeant } from "@/lib/session";
import { SOLIDARITY_STATUS } from "@/lib/solidarity";
import { formatDate } from "@/lib/utils";
import { decideSolidarityAction } from "../actions";

export default async function SolidarityPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const canDecide = canHandleSolidarity(v);
  const requests = await db.query.solidarityRequests.findMany({ orderBy: desc(schema.solidarityRequests.createdAt), with: { member: true } });
  const pending = requests.filter((r) => r.status === "DEMANDEE");
  const done = requests.filter((r) => r.status !== "DEMANDEE");

  return (
    <>
      <PageTitle title="Aides de solidarité" sub="Règlement intérieur, art. 6 : 50 000 Ar au membre, 25 000 Ar à sa famille proche, lors d'un événement heureux ou douloureux." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">
        Une aide accordée reste « à verser » : le versement passe par une pièce de dépense signée du Trésorier et visée par le conseil d'administration (statuts, art. 22).
      </p>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">À traiter ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">Aucune demande en attente.</p>}
        {pending.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold">{r.member.lastName} {r.member.firstNames} <span className="font-normal text-muted">({r.member.number})</span></div>
                <div className="text-[15px]">
                  {SOLIDARITE_EVENEMENTS[r.kind]} · {SOLIDARITE_CONCERNE[r.concerns]} · le {formatDate(r.eventDate)}
                </div>
                <div className="text-sm text-muted">Déclaré le {formatDate(r.createdAt)}{r.member.phone ? ` · ${r.member.phone}` : ""}</div>
              </div>
              <strong className="text-lg whitespace-nowrap">{formatAriary(r.amount)}</strong>
            </div>
            {r.message && <p className="rounded-xl bg-paper px-4 py-3 whitespace-pre-line">{r.message}</p>}
            {r.attachmentName && (
              <a href={`/api/solidarite/${r.id}`} target="_blank" className="flex items-center gap-2 self-start font-semibold text-brand-600 hover:underline">
                <Paperclip size={18} aria-hidden /> Pièce jointe : {r.attachmentName}
              </a>
            )}
            {canDecide ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ActionForm action={decideSolidarityAction.bind(null, r.id, "ACCORDEE")} className="flex flex-col gap-2">
                  <Input label="Message au membre (facultatif)" name="note" id={`note-ok-${r.id}`} />
                  <SubmitButton className="self-start">Accorder {formatAriary(r.amount)}</SubmitButton>
                </ActionForm>
                <ActionForm action={decideSolidarityAction.bind(null, r.id, "REFUSEE")} className="flex flex-col gap-2">
                  <Input label="Motif du refus" name="note" id={`note-ko-${r.id}`} required />
                  <SubmitButton variant="danger" className="self-start">Refuser</SubmitButton>
                </ActionForm>
              </div>
            ) : (
              <p className="text-sm text-muted">Décision réservée au conseil d'administration et au bureau exécutif.</p>
            )}
          </div>
        ))}
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-6 pt-5 pb-2 text-xl font-bold">Historique</h2>
        <table className="w-full min-w-170 text-left text-[14.5px]">
          <thead className="bg-paper text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Membre</th><th>Événement</th><th>Montant</th><th>Décision</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {done.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-muted">Aucune demande traitée pour le moment.</td></tr>}
            {done.map((r) => {
              const [label, tone] = SOLIDARITY_STATUS[r.status];
              return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">{r.member.lastName} {r.member.firstNames}</td>
                  <td className="py-3">{SOLIDARITE_EVENEMENTS[r.kind]} · {SOLIDARITE_CONCERNE[r.concerns]}<br /><span className="text-muted">le {formatDate(r.eventDate)}</span></td>
                  <td className="py-3 whitespace-nowrap">{formatAriary(r.amount)}</td>
                  <td className="py-3">{formatDate(r.decidedAt)}{r.decisionNote ? <><br /><span className="text-muted">{r.decisionNote}</span></> : null}</td>
                  <td className="py-3 pr-4"><Badge tone={tone}>{label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
