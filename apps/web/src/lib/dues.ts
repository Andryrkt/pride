import "server-only";
import { and, asc, db, eq, inArray, isNull, nextCounter, schema, type Tx } from "@pride/db";
import { formatAriary, monthlyFee, periodLabel, periodOf, periodsBetween, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { env } from "./env";
import { getPaymentProvider } from "./payments";

type Member = typeof schema.members.$inferSelect;

/** Crée les cotisations mensuelles manquantes jusqu'au mois courant. */
export async function ensureDues(member: Member, now = new Date()) {
  if (member.status !== "ACTIF") return;
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
function reserveDues(input: { memberId: string; dueIds: string[]; provider: PaymentProviderId | "ESPECES"; phone: string | null }) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.dues)
      .where(and(eq(schema.dues.memberId, input.memberId), inArray(schema.dues.id, input.dueIds), eq(schema.dues.status, "A_PAYER"), isNull(schema.dues.paymentId)))
      .for("update");
    // shortcut: un paiement resté EN_ATTENTE bloque ses échéances jusqu'à la notification de l'opérateur ; ajouter une expiration en branchant les vrais opérateurs.
    if (rows.length !== input.dueIds.length || rows.length === 0) throw new PaymentError("Certaines échéances sont déjà payées, en cours de paiement ou introuvables.");
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const [p] = await tx
      .insert(schema.payments)
      .values({ memberId: input.memberId, amount: total, provider: input.provider, phone: input.phone })
      .returning();
    await tx.update(schema.dues).set({ paymentId: p!.id }).where(inArray(schema.dues.id, input.dueIds));
    return { paymentId: p!.id, total };
  });
}

/**
 * Paiement de cotisations par mobile money.
 * En mode « simulation », le paiement est confirmé immédiatement.
 */
export async function payDues(input: { memberId: string; dueIds: string[]; provider: PaymentProviderId; phone: string }) {
  const { paymentId, total } = await reserveDues(input);
  const provider = getPaymentProvider(input.provider);
  const result = await provider.initiate({ paymentId, amount: total, phone: input.phone, description: `Cotisation PRIDe ${formatAriary(total)}` });
  await db.update(schema.payments).set({ providerRef: result.providerRef }).where(eq(schema.payments.id, paymentId));
  if (result.status === "REUSSI") return confirmPayment(paymentId);
  if (result.status === "ECHOUE") {
    await failPayment(paymentId);
    throw new PaymentError("Le paiement a été refusé par l'opérateur.");
  }
  return db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
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
      label: `Cotisation ${member?.number ?? ""} via ${PAYMENT_PROVIDERS[p.provider as PaymentProviderId] ?? "espèces"}`,
      direction: "RECETTE",
      amount: p.amount,
      pieceRef: receipt,
      paymentId: p.id,
      createdBy: actorId ?? null,
    });
    return updated!;
  });
}

export async function failPayment(paymentId: string) {
  await db.transaction(async (tx) => {
    const failed = await tx
      .update(schema.payments)
      .set({ status: "ECHOUE" })
      .where(and(eq(schema.payments.id, paymentId), eq(schema.payments.status, "EN_ATTENTE")))
      .returning();
    if (failed.length === 0) return;
    await tx.update(schema.dues).set({ paymentId: null }).where(and(eq(schema.dues.paymentId, paymentId), eq(schema.dues.status, "A_PAYER")));
  });
}
