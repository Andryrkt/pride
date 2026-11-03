import { asc, db, eq, schema } from "@pride/db";
import { formatAriary, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { dueLabel } from "@/lib/dues";
import { requireFinances } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { confirmDeclaredPaymentAction, rejectDeclaredPaymentAction } from "../actions";

/** Paiements mobile money déclarés par les membres : à confirmer après contrôle sur le compte de l'association. */
export default async function VerifyPaymentsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const v = await requireFinances();
  const { ok } = await searchParams;
  const pending = await db.query.payments.findMany({ where: eq(schema.payments.status, "EN_ATTENTE"), orderBy: asc(schema.payments.createdAt), with: { member: true, dues: true } });

  return (
    <>
      <PageTitle title="Paiements à vérifier" sub="Contrôlez sur le compte de l'association que la référence et le montant correspondent, avant de confirmer." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      {pending.length === 0 && <Card><p className="text-muted">Aucun paiement à vérifier.</p></Card>}
      {pending.map((p) => (
        <Card key={p.id} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{p.member.lastName} {p.member.firstNames}</h2>
            <strong className="font-display text-2xl">{formatAriary(p.amount)}</strong>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
            <div><dt className="text-sm text-muted">Référence</dt><dd className="font-mono font-semibold break-all">{p.providerRef ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted">Opérateur</dt><dd>{PAYMENT_PROVIDERS[p.provider as PaymentProviderId] ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted">Envoyé depuis</dt><dd>{p.phone ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted">Envoyé au numéro</dt><dd>{p.paidTo ?? "—"}</dd></div>
            <div><dt className="text-sm text-muted">Déclaré le</dt><dd>{formatDateTime(p.createdAt)}</dd></div>
            <div><dt className="text-sm text-muted">Échéances</dt><dd>{p.dues.map(dueLabel).join(", ")}</dd></div>
          </dl>
          {p.proofKey && v.canRecord && <a href={`/api/paiements/${p.id}/preuve`} target="_blank" rel="noreferrer" className="self-start font-semibold text-brand-600">Voir la capture jointe</a>}
          {p.memberId === v.member.id ? (
            <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">C'est votre propre paiement : une autre personne doit le vérifier.</p>
          ) : v.canRecord && (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <ActionForm action={confirmDeclaredPaymentAction.bind(null, p.id)}>
                <SubmitButton className="self-start" pendingLabel="Confirmation…">Argent reçu : confirmer</SubmitButton>
              </ActionForm>
              <details>
                <summary className="cursor-pointer font-semibold text-flame-800">Refuser ce paiement</summary>
                <ActionForm action={rejectDeclaredPaymentAction.bind(null, p.id)} className="mt-3 flex flex-col gap-3">
                  <Textarea label="Motif du refus" name="reason" id={`reason-${p.id}`} required rows={2} maxLength={200} hint="Le membre le reçoit, et ses échéances redeviennent à payer." />
                  <SubmitButton variant="outline" className="self-start" pendingLabel="Refus…">Refuser le paiement</SubmitButton>
                </ActionForm>
              </details>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
