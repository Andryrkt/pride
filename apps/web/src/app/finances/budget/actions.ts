"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, eq, schema } from "@pride/db";
import { LEDGER_ACCOUNTS, type LedgerAccount } from "@pride/shared";
import { adoptBudget, BudgetError, createBudget, removeLine, saveLine } from "@/lib/budget";
import { audit, canAdoptBudget, canEditBudgetLine, canPrepareBudget, requireMember } from "@/lib/session";
import type { FormState } from "@/lib/utils";

async function run(job: () => Promise<string>): Promise<FormState> {
  let message: string;
  try {
    message = await job();
  } catch (e) {
    if (e instanceof BudgetError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/finances/budget");
  revalidatePath("/membre/budget");
  return { ok: true, message };
}

export async function createBudgetAction(year: number, back: string): Promise<FormState> {
  const r = await run(async () => {
    const v = await requireMember();
    if (!canPrepareBudget(v)) throw new BudgetError("Réservé au comptable, au Trésorier, au Coordonnateur et à l'administrateur.");
    const b = await createBudget(year, v.member.id);
    await audit(v.member.id, "budget.brouillon", b.id, { year, version: b.version });
    return b.version > 1 ? `Budget rectificatif ${year} (version ${b.version}) en préparation : il reprend les lignes du budget adopté.` : `Budget ${year} en préparation.`;
  });
  if (!r.ok) return r;
  redirect(`${back}?annee=${year}&ok=${encodeURIComponent(r.message!)}`);
}

export async function saveLineAction(budgetId: string, _p: FormState, f: FormData): Promise<FormState> {
  const data = { account: String(f.get("account") ?? ""), commissionId: String(f.get("commissionId") ?? ""), label: String(f.get("label") ?? "").trim(), amount: String(f.get("amount") ?? "").trim() };
  const errors: Record<string, string> = {};
  if (!(data.account in LEDGER_ACCOUNTS)) errors.account = "Compte : champ obligatoire";
  if (!data.amount) errors.amount = "Montant prévu : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  const r = await run(async () => {
    const v = await requireMember();
    const commissionId = data.commissionId || null;
    if (!canEditBudgetLine(v, commissionId)) throw new BudgetError(commissionId ? "Vous n'êtes pas responsable de cette commission." : "Les lignes générales sont saisies par le comptable, le Trésorier, le Coordonnateur ou l'administrateur.");
    const { line, updated } = await saveLine(budgetId, { account: data.account as LedgerAccount, commissionId, label: data.label.slice(0, 200), amount: Number(data.amount) }, v.member.id);
    await audit(v.member.id, "budget.ligne", line.id, { budgetId, account: line.account, commissionId, amount: line.amount, updated });
    return updated ? "Ligne mise à jour (même compte et même commission)." : "Ligne ajoutée.";
  });
  return r.ok ? r : { ...r, data };
}

export async function removeLineAction(lineId: string): Promise<FormState> {
  return run(async () => {
    const v = await requireMember();
    const line = await db.query.budgetLines.findFirst({ where: eq(schema.budgetLines.id, lineId) });
    if (!line || !canEditBudgetLine(v, line.commissionId)) throw new BudgetError("Vous ne pouvez pas retirer cette ligne.");
    await removeLine(lineId);
    await audit(v.member.id, "budget.ligne_retiree", lineId, { budgetId: line.budgetId, account: line.account, commissionId: line.commissionId, amount: line.amount });
    return "Ligne retirée.";
  });
}

export async function adoptBudgetAction(budgetId: string, _p: FormState, f: FormData): Promise<FormState> {
  const date = new Date(String(f.get("meetingDate") ?? ""));
  if (Number.isNaN(date.getTime())) return { ok: false, message: "Indiquez la date de la réunion du CA.", errors: { meetingDate: "Date de la réunion : champ obligatoire" } };
  let year = 0;
  const r = await run(async () => {
    const v = await requireMember();
    if (!canAdoptBudget(v)) throw new BudgetError("L'adoption du budget revient au conseil d'administration.");
    const b = await adoptBudget(budgetId, date, v.member.id);
    year = b.year;
    await audit(v.member.id, "budget.adopte", b.id, { year: b.year, version: b.version, meetingDate: date });
    return `Budget ${b.year} (version ${b.version}) adopté : il est maintenant verrouillé.`;
  });
  if (!r.ok) return r;
  redirect(`/finances/budget?annee=${year}&ok=${encodeURIComponent(r.message!)}`);
}
