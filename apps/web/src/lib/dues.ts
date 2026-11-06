import "server-only";
import { and, asc, db, eq, inArray, isNull, ne, nextCounter, schema, type Tx } from "@pride/db";
import { formatAriary, monthlyFee, periodLabel, periodOf, periodsBetween, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { responsableEmails } from "./commissions";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";

type Member = typeof schema.members.$inferSelect;

/**
 * Crée les cotisations mensuelles manquantes jusqu'au mois courant.
 * La fiche technique du premier administrateur n'en a pas : elle n'entre ni dans les montants attendus ni dans les retards.
 */
export async function ensureDues(member: Member, now = new Date()) {
  if (member.status !== "ACTIF" || member.technical) return;
  const joined = periodOf(new Date(member.joinedAt));
  const start = joined > env.duesStartPeriod ? joined : env.duesStartPeriod;
  const [y, m] = start.split("-").map(Number);
  const periods = periodsBetween(new Date(y!, m! - 1, 1), now);
  if (periods.length === 0) return;
  await db
    .insert(schema.dues)
    .values(periods.map((period) => ({ memberId: member.id, kind: "COTISATION" as const, period, amount: monthlyFee(member.category) })))
    .onConflictDoNothing();
}

export async function listDues(memberId: string) {
  return db.query.dues.findMany({
    where: eq(schema.dues.memberId, memberId),
    orderBy: [asc(schema.dues.period), asc(schema.dues.kind)],
    with: { payment: true },
  });
}

export function dueLabel(d: { kind: string; period: string }) {
  return d.kind === "DROIT_ENTREE" ? "Droit d'entrée" : `Cotisation ${periodLabel(d.period)}`;
}

export class PaymentError extends Error {}

/** Réserve des échéances à payer pour un nouveau paiement (une échéance déjà en cours de paiement est refusée). */
function reserveDues(input: { memberId: string; dueIds: string[]; provider: PaymentProviderId | "ESPECES"; phone: string | null; providerRef?: string; paidTo?: string }) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.dues)
      .where(and(eq(schema.dues.memberId, input.memberId), inArray(schema.dues.id, input.dueIds), eq(schema.dues.status, "A_PAYER"), isNull(schema.dues.paymentId)))
      .for("update");
    if (rows.length !== input.dueIds.length || rows.length === 0) throw new PaymentError("Certaines échéances sont déjà payées, en cours de paiement ou introuvables.");
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const [p] = await tx
      .insert(schema.payments)
      .values({ memberId: input.memberId, amount: total, provider: input.provider, phone: input.phone, providerRef: input.providerRef, paidTo: input.paidTo })
      .returning();
    await tx.update(schema.dues).set({ paymentId: p!.id }).where(inArray(schema.dues.id, input.dueIds));
    return { paymentId: p!.id, total };
  });
}

export const listPaymentAccounts = () => db.query.paymentAccounts.findMany({ orderBy: asc(schema.paymentAccounts.provider) });

const mailPayment = (to: string[], subject: string, text: string) =>
  sendMail({ to: [...new Set(to)].join(", "), subject, text }).catch((err) => console.error("E-mail non envoyé :", subject, err));

/** Le changement d'un numéro détourne potentiellement l'argent des membres : l'association en est toujours prévenue. */
export async function savePaymentAccount(provider: PaymentProviderId, number: string, holder: string, actorName: string) {
  await db.insert(schema.paymentAccounts).values({ provider, number, holder }).onConflictDoUpdate({ target: schema.paymentAccounts.provider, set: { number, holder, updatedAt: new Date() } });
  await mailPayment([env.mailAssociation], `PRIDe : numéro ${PAYMENT_PROVIDERS[provider]} modifié`, `Bonjour,\n\n${actorName} a enregistré ce numéro ${PAYMENT_PROVIDERS[provider]} pour les cotisations :\n${number} (${holder})\n\nSi ce changement vous surprend, vérifiez-le sans attendre : ${env.appUrl}/finances/numeros\n\nPRIDe`);
}

export async function removePaymentAccount(provider: PaymentProviderId, actorName: string) {
  await db.delete(schema.paymentAccounts).where(eq(schema.paymentAccounts.provider, provider));
  await mailPayment([env.mailAssociation], `PRIDe : numéro ${PAYMENT_PROVIDERS[provider]} retiré`, `Bonjour,\n\n${actorName} a retiré le numéro ${PAYMENT_PROVIDERS[provider]} des cotisations : cet opérateur n'est plus proposé aux membres.\n\nPRIDe`);
}

/**
 * Le membre a envoyé l'argent par son menu mobile money et le déclare :
 * ni reçu ni écriture au journal avant la vérification sur le compte de l'association.
 * `proof` : capture facultative, déjà validée (type et taille) par l'action.
 */
export async function declarePayment(input: { memberId: string; dueIds: string[]; provider: PaymentProviderId; phone: string; reference: string }, proof?: File) {
  const account = await db.query.paymentAccounts.findFirst({ where: eq(schema.paymentAccounts.provider, input.provider) });
  if (!account) throw new PaymentError("Cet opérateur n'est pas encore ouvert aux paiements.");
  const used = await db.query.payments.findFirst({ where: and(eq(schema.payments.provider, input.provider), eq(schema.payments.providerRef, input.reference), ne(schema.payments.status, "ECHOUE")) });
  if (used) throw new PaymentError("Cette référence a déjà été déclarée. Vérifiez-la dans le SMS de votre opérateur.");
  const { paymentId, total } = await reserveDues({ ...input, providerRef: input.reference, paidTo: account.number });

  if (proof) {
    const ext = /\.([a-z0-9]{1,5})$/i.exec(proof.name)?.[1]?.toLowerCase() ?? "bin";
    const key = `paiements/${paymentId}/capture-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    try {
      await putFile(key, Buffer.from(await proof.arrayBuffer()), proof.type);
      await db.update(schema.payments).set({ proofKey: key, proofName: proof.name, proofType: proof.type }).where(eq(schema.payments.id, paymentId));
    } catch (e) {
      // Sans sa capture, la déclaration est retirée : le membre la renvoie complète.
      console.error("Capture du paiement non enregistrée", e);
      await failPayment(paymentId, "Capture non enregistrée : déclaration à refaire.");
      throw new PaymentError("La capture n'a pas pu être enregistrée. Merci de réessayer.");
    }
  }

  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  const others = (emails: string[]) => emails.filter((m) => m !== member?.email);
  let to = others(await responsableEmails(null, ["COMPTABLE", "TRESORIER"]));
  if (!to.length) to = others(await responsableEmails(null, ["ADMIN_TECHNIQUE"]));
  if (!to.length) to = [env.mailAssociation];
  await mailPayment(to, `PRIDe : paiement à vérifier, ${member?.lastName ?? ""} ${formatAriary(total)}`, `Bonjour,\n\n${member?.lastName ?? ""} ${member?.firstNames ?? ""} déclare un paiement de ${formatAriary(total)} par ${PAYMENT_PROVIDERS[input.provider]}.\nRéférence : ${input.reference}\nEnvoyé depuis : ${input.phone}\n\nÀ vérifier sur le compte de l'association, puis dans l'espace Finances : ${env.appUrl}/finances/verifier\n\nPRIDe`);
  return db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
}

/** Vérification : possible une seule fois, et jamais sur son propre paiement. */
async function declaredPayment(paymentId: string, actorId: string) {
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId), with: { member: true } });
  if (!p) throw new PaymentError("Paiement introuvable.");
  if (p.status !== "EN_ATTENTE") throw new PaymentError("Ce paiement a déjà été traité.");
  if (p.memberId === actorId) throw new PaymentError("C'est votre propre paiement : une autre personne doit le vérifier.");
  return p;
}

export async function verifyPayment(paymentId: string, actorId: string) {
  const { member } = await declaredPayment(paymentId, actorId);
  const p = await confirmPayment(paymentId, actorId);
  if (p.status !== "REUSSI") throw new PaymentError("Ce paiement a déjà été traité.");
  if (member.email) await mailPayment([member.email], `PRIDe : paiement confirmé, reçu ${p.receiptNumber}`, `Bonjour,\n\nNous avons bien reçu votre paiement de ${formatAriary(p.amount)}. Merci !\nReçu n° ${p.receiptNumber}, à retrouver dans « Mes cotisations » : ${env.appUrl}/membre/cotisations\n\nPRIDe`);
  return p;
}

export async function rejectPayment(paymentId: string, reason: string, actorId: string) {
  const p = await declaredPayment(paymentId, actorId);
  if (!(await failPayment(paymentId, reason))) throw new PaymentError("Ce paiement a déjà été traité.");
  if (p.member.email) await mailPayment([p.member.email], "PRIDe : paiement non confirmé", `Bonjour,\n\nNous n'avons pas pu confirmer votre paiement de ${formatAriary(p.amount)} (référence ${p.providerRef}).\nMotif : ${reason}\n\nVos échéances restent à payer. Vous pouvez déclarer à nouveau votre paiement, ou répondre via la messagerie si vous pensez qu'il s'agit d'une erreur : ${env.appUrl}/membre/cotisations\n\nPRIDe`);
  return p;
}

/** Espèces remises au comptable ou au Trésorier : confirmé tout de suite (reçu, échéances payées, journal). */
export async function payCash(memberId: string, dueIds: string[], actorId: string) {
  const { paymentId } = await reserveDues({ memberId, dueIds, provider: "ESPECES", phone: null });
  return confirmPayment(paymentId, actorId);
}

/** Confirme un paiement : reçu, échéances payées, écriture au journal comptable (non modifiable). */
export async function confirmPayment(paymentId: string, actorId?: string) {
  return db.transaction(async (tx: Tx) => {
    const [p] = await tx.select().from(schema.payments).where(eq(schema.payments.id, paymentId)).for("update");
    if (!p) throw new PaymentError("Paiement introuvable.");
    // Un paiement déjà réussi ou échoué ne change plus d'état (notification rejouée ou en retard).
    if (p.status !== "EN_ATTENTE") return p;
    const year = new Date().getFullYear();
    const receipt = `R-${year}-${String(await nextCounter(`receipt-${year}`, tx)).padStart(4, "0")}`;
    const now = new Date();
    const [updated] = await tx
      .update(schema.payments)
      .set({ status: "REUSSI", receiptNumber: receipt, confirmedAt: now })
      .where(eq(schema.payments.id, paymentId))
      .returning();
    await tx.update(schema.dues).set({ status: "PAYEE", paidAt: now }).where(eq(schema.dues.paymentId, paymentId));
    const member = await tx.query.members.findFirst({ where: eq(schema.members.id, p.memberId) });
    await tx.insert(schema.ledgerEntries).values({
      label: `Cotisation ${member?.number ?? ""} via ${PAYMENT_PROVIDERS[p.provider as PaymentProviderId] ?? "espèces"}${p.providerRef ? ` (réf. ${p.providerRef})` : ""}`,
      direction: "RECETTE",
      amount: p.amount,
      pieceRef: receipt,
      paymentId: p.id,
      account: "COTISATIONS",
      createdBy: actorId ?? null,
    });
    return updated!;
  });
}

/** Renvoie false si le paiement n'était plus en attente. */
export async function failPayment(paymentId: string, reason?: string) {
  return db.transaction(async (tx) => {
    const failed = await tx
      .update(schema.payments)
      .set({ status: "ECHOUE", rejectionReason: reason })
      .where(and(eq(schema.payments.id, paymentId), eq(schema.payments.status, "EN_ATTENTE")))
      .returning();
    if (failed.length === 0) return false;
    await tx.update(schema.dues).set({ paymentId: null }).where(and(eq(schema.dues.paymentId, paymentId), eq(schema.dues.status, "A_PAYER")));
    return true;
  });
}
