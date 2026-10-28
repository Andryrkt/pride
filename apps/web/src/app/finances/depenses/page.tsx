import { accountsFor, formatAriary, LEDGER_ACCOUNTS } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { budgetFollowUp } from "@/lib/budget";
import { accountLabel, EXPENSE_STATUS, expenseBudgetLines, expenseList, pieceRef } from "@/lib/finances";
import { requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { approveExpenseAction, payExpenseAction, prepareAidExpenseAction, prepareExpenseAction, rejectExpenseAction, signExpenseAction } from "../actions";

const who = (m?: { firstNames: string; lastName: string } | null) => (m ? `${m.firstNames} ${m.lastName}` : "");

/** Statuts, art. 22 : toute pièce de dépense est signée par le Trésorier et visée par le CA avant d'être payée. */
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const v = await requireFinances();
  const [{ open, closed, aidsWithoutPiece }, budgetLines, { lines: followUp }] = await Promise.all([expenseList(), expenseBudgetLines(), budgetFollowUp(new Date().getFullYear())]);
  // Reste de la ligne après toutes les pièces en cours (dont celle-ci) : négatif = dépassement.
  const restOf = (l: { account: string; commissionId: string | null }) => followUp.find((f) => f.account === l.account && f.commissionId === l.commissionId)?.reste;

  return (
    <>
      <PageTitle title="Dépenses à viser" sub="Statuts, art. 22 : toute pièce de dépense est signée par le Trésorier et visée par un membre du conseil d'administration, puis payée et inscrite au journal." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <ol className="grid gap-3 text-[15px] sm:grid-cols-4">
        {["Préparée par le comptable ou le Trésorier", "Signée par le Trésorier", "Visée par un membre du CA (autre que le signataire)", "Payée : dépense au journal"].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-line">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      {aidsWithoutPiece.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Aides de solidarité accordées, pièce à préparer ({aidsWithoutPiece.length})</h2>
          {aidsWithoutPiece.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
              <span>
                <strong>{a.member.lastName} {a.member.firstNames}</strong> · accordée le {formatDate(a.decidedAt)}
                {a.member.phone ? ` · ${a.member.phone}` : ""}
              </span>
              <span className="flex items-center gap-3">
                <strong>{formatAriary(a.amount)}</strong>
                {v.canRecord && (
                  <ActionForm action={prepareAidExpenseAction.bind(null, a.id)} className="flex flex-col gap-1">
                    <SubmitButton size="sm">Préparer la pièce</SubmitButton>
                  </ActionForm>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">En cours ({open.length})</h2>
        {open.length === 0 && <p className="text-muted">Aucune pièce de dépense en attente.</p>}
        {open.map((e) => {
          const [label, tone] = EXPENSE_STATUS[e.status];
          const canSignThis = v.canSign && e.status === "A_SIGNER";
          const canApproveThis = v.canApprove && e.status === "A_VISER" && e.signedBy !== v.member.id;
          return (
            <article key={e.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold">{e.label}</span>
                  <span className="text-sm text-muted">Pièce {pieceRef(e.number)} · {accountLabel(e.account)} · préparée par {who(e.creator)} le {formatDate(e.createdAt)}</span>
                  <BudgetNote line={e.line} rest={e.line ? restOf(e.line) : undefined} />
                  <div className="flex flex-wrap gap-2">
                    {e.signedAt && <Badge>Signée : {who(e.signer)}, {formatDate(e.signedAt)} ✓</Badge>}
                    {e.visaAt && <Badge>Visée : {who(e.approver)}, {formatDate(e.visaAt)} ✓</Badge>}
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </div>
                <strong className="text-lg whitespace-nowrap">{formatAriary(e.amount)}</strong>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {canSignThis && (
                  <ActionForm action={signExpenseAction.bind(null, e.id)} className="flex flex-col gap-1">
                    <SubmitButton size="sm">Signer (Trésorier)</SubmitButton>
                  </ActionForm>
                )}
                {canApproveThis && (
                  <ActionForm action={approveExpenseAction.bind(null, e.id)} className="flex flex-col gap-1">
                    <SubmitButton size="sm">Viser (CA)</SubmitButton>
                  </ActionForm>
                )}
                {v.canApprove && e.status === "A_VISER" && e.signedBy === v.member.id && (
                  <p className="text-sm text-muted">Vous avez signé cette pièce : le visa revient à un autre membre du CA.</p>
                )}
                {v.canRecord && e.status === "A_PAYER" && (
                  <ActionForm action={payExpenseAction.bind(null, e.id)} className="flex flex-col gap-1">
                    <SubmitButton size="sm">Enregistrer le paiement</SubmitButton>
                  </ActionForm>
                )}
                {(canSignThis || (v.canApprove && e.status === "A_VISER")) && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold text-flame-600">Rejeter</summary>
                    <ActionForm action={rejectExpenseAction.bind(null, e.id)} className="mt-2 flex w-72 flex-col gap-2">
                      <Input label="Motif" name="reason" id={`reject-${e.id}`} required placeholder="Ex. : facture manquante" />
                      <SubmitButton size="sm" variant="danger" className="self-start">Rejeter la pièce</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </Card>

      {v.canRecord && (
        <Card>
          <h2 className="mb-3 text-xl font-bold">Nouvelle pièce de dépense</h2>
          <ActionForm action={prepareExpenseAction}>
            <RequiredLegend />
            <div className="grid gap-3 sm:grid-cols-[1fr_320px_200px]">
              <Input label="Objet de la dépense" name="label" required placeholder="Ex. : fournitures pour la formation (papier, marqueurs)" />
              <Select label="Imputation (ligne du budget)" name="imputation" required defaultValue="">
                <option value="">Choisissez…</option>
                {budgetLines.length > 0 && (
                  <optgroup label="Budget adopté">
                    {budgetLines.map((l) => <option key={l.id} value={`line:${l.id}`}>{LEDGER_ACCOUNTS[l.account as keyof typeof LEDGER_ACCOUNTS]?.[0] ?? l.account} · {l.commission?.name ?? "Général"}{l.label ? ` · ${l.label}` : ""}</option>)}
                  </optgroup>
                )}
                <optgroup label="Hors budget">
                  {accountsFor("DEPENSE").map((k) => <option key={k} value={`acc:${k}`}>Hors budget · {LEDGER_ACCOUNTS[k][0]}</option>)}
                </optgroup>
              </Select>
              <Input label="Montant (Ar)" name="amount" type="number" min={1} step={1} required />
            </div>
            <SubmitButton className="self-start">Préparer la pièce</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <h2 className="px-6 pt-5 pb-2 text-xl font-bold">Historique</h2>
        <table className="w-full min-w-170 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Pièce</th><th>Objet</th><th className="text-right">Montant</th><th className="px-4">Statut</th></tr>
          </thead>
          <tbody>
            {closed.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-muted">Aucune pièce payée ou rejetée pour le moment.</td></tr>}
            {closed.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="px-4 py-3 font-mono text-sm">{pieceRef(e.number)}</td>
                <td className="py-3">
                  {e.label}
                  <br />
                  <span className="text-muted">
                    {e.status === "PAYEE" ? `Signée : ${who(e.signer)} · visée : ${who(e.approver)} · payée le ${formatDate(e.paidAt)}` : `Motif : ${e.rejectReason}`}
                  </span>
                </td>
                <td className="py-3 text-right whitespace-nowrap">{formatAriary(e.amount)}</td>
                <td className="px-4 py-3"><Badge tone={EXPENSE_STATUS[e.status][1]}>{EXPENSE_STATUS[e.status][0]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

/** Imputation de la pièce : ligne du budget et reste après les pièces en cours, ou avertissement « hors budget ». */
function BudgetNote({ line, rest }: { line: { account: string; commission: { name: string } | null } | null; rest?: number }) {
  if (!line) return <span className="self-start rounded-lg bg-sun-50 px-2 py-1 text-sm font-semibold text-sun-800">Hors budget</span>;
  const where = `${accountLabel(line.account)} · ${line.commission?.name ?? "Général"}`;
  if (rest === undefined) return <span className="text-sm text-muted">Budget : {where}</span>;
  return rest < 0 ? (
    <span className="self-start rounded-lg bg-flame-50 px-2 py-1 text-sm font-semibold text-flame-800">Budget : {where} · dépassement de {formatAriary(-rest)}</span>
  ) : (
    <span className="text-sm text-muted">Budget : {where} · reste {formatAriary(rest)} après les pièces en cours</span>
  );
}
