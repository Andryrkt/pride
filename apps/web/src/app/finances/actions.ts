"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentError, payCash } from "@/lib/dues";
import { addEntry, approveExpense, correctEntry, FinanceError, payExpense, pieceRef, prepareAidExpense, prepareExpense, rejectExpense, signExpense } from "@/lib/finances";
import { audit, requireFinances } from "@/lib/session";
import type { FormState } from "@/lib/utils";

/** Seuls le comptable, le Trésorier et l'administrateur enregistrent ; les autres dirigeants consultent. */
async function recorder() {
  const v = await requireFinances();
  if (!v.canRecord) throw new FinanceError("Lecture seule : seuls le comptable, le Trésorier et l'administrateur enregistrent des opérations.");
  return v;
}

/** Quand le formulaire disparaît après l'opération (échéances payées, aide versée…), le message s'affiche en haut de la page. */
async function runThenShow(path: string, job: () => Promise<string>): Promise<FormState> {
  const r = await run(job);
  if (!r.ok) return r;
  redirect(`${path}${path.includes("?") ? "&" : "?"}ok=${encodeURIComponent(r.message!)}`);
}

async function run(job: () => Promise<string>): Promise<FormState> {
  let message: string;
  try {
    message = await job();
  } catch (e) {
    if (e instanceof FinanceError || e instanceof PaymentError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/finances", "layout");
  return { ok: true, message };
}

export async function addEntryAction(_p: FormState, f: FormData): Promise<FormState> {
  const data = Object.fromEntries(["date", "label", "amount", "pieceRef"].map((k) => [k, String(f.get(k) ?? "").trim()]));
  const errors: Record<string, string> = {};
  const date = new Date(data.date!);
  if (Number.isNaN(date.getTime())) errors.date = "Date : champ obligatoire";
  if (!data.label) errors.label = "Libellé : champ obligatoire";
  if (!data.amount) errors.amount = "Montant : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  const r = await run(async () => {
    const v = await recorder();
    const e = await addEntry({ date, label: data.label!.slice(0, 200), amount: Number(data.amount), pieceRef: data.pieceRef!.slice(0, 40) }, v.member.id);
    await audit(v.member.id, "finances.ecriture", e.id, { number: e.number, direction: e.direction, amount: e.amount, label: e.label });
    return `Recette enregistrée (écriture n° ${e.number}).`;
  });
  return r.ok ? r : { ...r, data };
}

export async function correctEntryAction(entryId: string, _p: FormState, f: FormData): Promise<FormState> {
  const reason = String(f.get("reason") ?? "").trim();
  if (!reason) return { ok: false, message: "Indiquez le motif de la rectification.", errors: { reason: "Motif : champ obligatoire" } };
  return runThenShow("/finances/journal", async () => {
    const v = await recorder();
    const e = await correctEntry(entryId, reason.slice(0, 200), v.member.id);
    await audit(v.member.id, "finances.rectification", entryId, { rectification: e.number, reason });
    return `Rectification enregistrée (écriture n° ${e.number}).`;
  });
}

export async function payCashAction(memberId: string, _p: FormState, f: FormData): Promise<FormState> {
  const dueIds = f.getAll("due").map(String);
  if (dueIds.length === 0) return { ok: false, message: "Cochez au moins une échéance." };
  return runThenShow(`/finances/encaisser?membre=${memberId}`, async () => {
    const v = await recorder();
    const p = await payCash(memberId, dueIds, v.member.id);
    await audit(v.member.id, "finances.especes", memberId, { paymentId: p.id, amount: p.amount, receipt: p.receiptNumber });
    return `Paiement en espèces enregistré : reçu n° ${p.receiptNumber}. Le membre le retrouve dans « Mes cotisations ».`;
  });
}

/** Garde d'une étape du visa : `allowed` dit qui peut la franchir. */
async function step(allowed: (v: Awaited<ReturnType<typeof requireFinances>>) => boolean, who: string) {
  const v = await requireFinances();
  if (!allowed(v)) throw new FinanceError(`Réservé ${who}.`);
  return v;
}

export async function prepareExpenseAction(_p: FormState, f: FormData): Promise<FormState> {
  const data = { label: String(f.get("label") ?? "").trim(), amount: String(f.get("amount") ?? "").trim() };
  const errors: Record<string, string> = {};
  if (!data.label) errors.label = "Objet de la dépense : champ obligatoire";
  if (!data.amount) errors.amount = "Montant : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  const r = await runThenShow("/finances/depenses", async () => {
    const v = await recorder();
    const e = await prepareExpense({ label: data.label.slice(0, 200), amount: Number(data.amount) }, v.member.id);
    await audit(v.member.id, "finances.depense_preparee", e.id, { piece: pieceRef(e.number), amount: e.amount, label: e.label });
    return `Pièce ${pieceRef(e.number)} préparée : elle attend la signature du Trésorier.`;
  });
  return r.ok ? r : { ...r, data };
}

export async function prepareAidExpenseAction(requestId: string): Promise<FormState> {
  return runThenShow("/finances/depenses", async () => {
    const v = await recorder();
    const e = await prepareAidExpense(requestId, v.member.id);
    await audit(v.member.id, "finances.depense_preparee", e.id, { piece: pieceRef(e.number), amount: e.amount, solidarityRequestId: requestId });
    return `Pièce ${pieceRef(e.number)} préparée pour l'aide : elle attend la signature du Trésorier.`;
  });
}

export async function signExpenseAction(id: string): Promise<FormState> {
  return runThenShow("/finances/depenses", async () => {
    const v = await step((v) => v.canSign, "au Trésorier");
    const e = await signExpense(id, v.member.id);
    await audit(v.member.id, "finances.depense_signee", id, { piece: pieceRef(e.number) });
    return `Pièce ${pieceRef(e.number)} signée : elle attend le visa du conseil d'administration.`;
  });
}

export async function approveExpenseAction(id: string): Promise<FormState> {
  return runThenShow("/finances/depenses", async () => {
    const v = await step((v) => v.canApprove, "aux membres du conseil d'administration");
    const e = await approveExpense(id, v.member.id);
    await audit(v.member.id, "finances.depense_visee", id, { piece: pieceRef(e.number) });
    return `Pièce ${pieceRef(e.number)} visée : elle peut être payée.`;
  });
}

export async function rejectExpenseAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const reason = String(f.get("reason") ?? "").trim();
  if (!reason) return { ok: false, message: "Indiquez le motif du rejet.", errors: { reason: "Motif : champ obligatoire" } };
  return runThenShow("/finances/depenses", async () => {
    const v = await step((v) => v.canSign || v.canApprove, "au Trésorier et au conseil d'administration");
    const e = await rejectExpense(id, reason.slice(0, 200), v.member.id);
    await audit(v.member.id, "finances.depense_rejetee", id, { piece: pieceRef(e.number), reason });
    return `Pièce ${pieceRef(e.number)} rejetée.`;
  });
}

export async function payExpenseAction(id: string): Promise<FormState> {
  return runThenShow("/finances/depenses", async () => {
    const v = await recorder();
    const { expense: e, entry } = await payExpense(id, v.member.id);
    await audit(v.member.id, "finances.depense_payee", id, { piece: pieceRef(e.number), amount: e.amount, ecriture: entry.number, solidarityRequestId: e.solidarityRequestId });
    return `Pièce ${pieceRef(e.number)} payée : dépense inscrite au journal (écriture n° ${entry.number})${e.solidarityRequestId ? ", membre prévenu" : ""}.`;
  });
}
