"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentError, payCash } from "@/lib/dues";
import { addEntry, correctEntry, FinanceError, paySolidarity } from "@/lib/finances";
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
  const data = Object.fromEntries(["date", "label", "direction", "amount", "pieceRef"].map((k) => [k, String(f.get(k) ?? "").trim()]));
  const errors: Record<string, string> = {};
  const date = new Date(data.date!);
  if (Number.isNaN(date.getTime())) errors.date = "Date : champ obligatoire";
  if (!data.label) errors.label = "Libellé : champ obligatoire";
  if (data.direction !== "RECETTE" && data.direction !== "DEPENSE") errors.direction = "Recette ou dépense : champ obligatoire";
  if (!data.amount) errors.amount = "Montant : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  const r = await run(async () => {
    const v = await recorder();
    const e = await addEntry({ date, label: data.label!.slice(0, 200), direction: data.direction as "RECETTE" | "DEPENSE", amount: Number(data.amount), pieceRef: data.pieceRef!.slice(0, 40) }, v.member.id);
    await audit(v.member.id, "finances.ecriture", e.id, { number: e.number, direction: e.direction, amount: e.amount, label: e.label });
    return `Écriture n° ${e.number} enregistrée.`;
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

export async function paySolidarityAction(requestId: string, _p: FormState, f: FormData): Promise<FormState> {
  return runThenShow("/finances", async () => {
    const v = await recorder();
    const r = await paySolidarity(requestId, String(f.get("pieceRef") ?? "").trim().slice(0, 40), v.member.id);
    await audit(v.member.id, "finances.aide_versee", requestId, { memberId: r.memberId, amount: r.amount });
    return "Aide versée : dépense enregistrée au journal, membre prévenu.";
  });
}
