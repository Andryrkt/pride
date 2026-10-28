import { and, asc, db, eq, schema } from "@pride/db";
import { formatAriary } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { dueLabel, ensureDues } from "@/lib/dues";
import { requireFinances } from "@/lib/session";
import { payCashAction } from "../actions";

/** Cotisations payées en espèces : on choisit le membre, puis les mois réglés. */
export default async function CashPage({ searchParams }: { searchParams: Promise<{ membre?: string; ok?: string }> }) {
  const v = await requireFinances();
  const { membre: memberId = "", ok } = await searchParams;
  const members = await db.query.members.findMany({ where: eq(schema.members.status, "ACTIF"), orderBy: [asc(schema.members.lastName), asc(schema.members.firstNames)] });
  const member = members.find((m) => m.id === memberId);
  if (member) await ensureDues(member);
  const unpaid = member
    ? await db.query.dues.findMany({ where: and(eq(schema.dues.memberId, member.id), eq(schema.dues.status, "A_PAYER")), orderBy: asc(schema.dues.period) })
    : [];

  return (
    <>
      <PageTitle title="Encaisser en espèces" sub="Le membre reçoit un reçu dans son espace ; la recette s'inscrit au journal comptable." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-[1_1_320px] flex-col gap-1.5 text-sm font-semibold">
            Membre
            <select name="membre" defaultValue={memberId} required className="min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 font-normal">
              <option value="">Choisissez…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.lastName} {m.firstNames} · {m.number}</option>)}
            </select>
          </label>
          <button className="min-h-12 rounded-full bg-brand-600 px-6 font-semibold text-white">Afficher ses échéances</button>
        </form>
      </Card>

      {member && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{member.lastName} {member.firstNames} · échéances à payer</h2>
          {unpaid.length === 0 ? (
            <p className="text-muted">Ce membre est à jour de ses cotisations.</p>
          ) : !v.canRecord ? (
            <ul className="divide-y divide-line">{unpaid.map((d) => <li key={d.id} className="flex justify-between py-2"><span>{dueLabel(d)}</span><strong>{formatAriary(d.amount)}</strong></li>)}</ul>
          ) : (
            <ActionForm action={payCashAction.bind(null, member.id)}>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">Mois réglés en espèces</legend>
                {unpaid.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                    <input type="checkbox" name="due" value={d.id} defaultChecked={!d.paymentId} disabled={!!d.paymentId} className="size-5" />
                    <span className="flex-1">{dueLabel(d)}{d.paymentId ? " · paiement mobile en cours" : ""}</span>
                    <strong>{formatAriary(d.amount)}</strong>
                  </label>
                ))}
              </fieldset>
              <SubmitButton className="self-start" pendingLabel="Enregistrement…">Enregistrer le paiement en espèces</SubmitButton>
            </ActionForm>
          )}
        </Card>
      )}
    </>
  );
}
