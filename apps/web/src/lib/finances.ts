import "server-only";
import { and, asc, db, desc, eq, gte, inArray, lt, ne, schema, sql, sum } from "@pride/db";
import { formatAriary, type MandateRole, periodOf, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS } from "@pride/shared";
import { responsableEmails } from "./commissions";
import { env } from "./env";
import { sendMail } from "./mail";
import { formatDate } from "./utils";

export class FinanceError extends Error {}
type Direction = "RECETTE" | "DEPENSE";

const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const n = (v: unknown) => Number(v ?? 0);

/** Chiffres du tableau de bord financier (mois en cours et solde depuis le début du journal). */
export async function financeSummary() {
  const start = monthStart();
  const period = periodOf(new Date());
  const byDirection = (where?: ReturnType<typeof gte>) =>
    db.select({ direction: schema.ledgerEntries.direction, total: sum(schema.ledgerEntries.amount) }).from(schema.ledgerEntries).where(where).groupBy(schema.ledgerEntries.direction);
  const [month, all, [due], [paid], [late]] = await Promise.all([
    byDirection(gte(schema.ledgerEntries.date, start)),
    byDirection(),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(eq(schema.dues.period, period)),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(and(eq(schema.dues.period, period), eq(schema.dues.status, "PAYEE"))),
    db
      .select({ members: sql<number>`count(distinct ${schema.dues.memberId})`, total: sum(schema.dues.amount) })
      .from(schema.dues)
      .innerJoin(schema.members, eq(schema.members.id, schema.dues.memberId))
      .where(and(eq(schema.dues.status, "A_PAYER"), lt(schema.dues.period, period), eq(schema.members.status, "ACTIF"))),
  ]);
  const pick = (rows: { direction: string; total: unknown }[], d: Direction) => n(rows.find((r) => r.direction === d)?.total);
  return {
    recettesMois: pick(month, "RECETTE"),
    depensesMois: pick(month, "DEPENSE"),
    solde: pick(all, "RECETTE") - pick(all, "DEPENSE"),
    cotisationsAttendues: n(due!.s),
    cotisationsPayees: n(paid!.s),
    membresEnRetard: n(late!.members),
    montantEnRetard: n(late!.total),
  };
}

/** Écritures d'une année, la plus récente en premier, avec l'écriture qui les rectifie éventuellement. */
export async function journal(year: number) {
  const rows = await db.query.ledgerEntries.findMany({
    where: and(gte(schema.ledgerEntries.date, new Date(year, 0, 1)), lt(schema.ledgerEntries.date, new Date(year + 1, 0, 1))),
    orderBy: desc(schema.ledgerEntries.number),
  });
  const corrected = new Set(rows.map((r) => r.correctsId).filter(Boolean));
  return rows.map((r) => ({ ...r, corrected: corrected.has(r.id) }));
}

/**
 * Nouvelle recette validée : elle ne pourra plus être ni modifiée ni supprimée (statuts, art. 21).
 * Les dépenses passent par une pièce signée et visée (art. 22) : voir `payExpense`.
 */
export async function addEntry(e: { date: Date; label: string; amount: number; pieceRef: string }, actorId: string) {
  checkAmount(e.amount);
  if (e.date > new Date()) throw new FinanceError("La date d'une écriture ne peut pas être dans le futur.");
  const [row] = await db.insert(schema.ledgerEntries).values({ ...e, direction: "RECETTE", pieceRef: e.pieceRef || null, createdBy: actorId }).returning();
  return row!;
}

/** Rectification : une écriture inverse du même montant, liée à l'écriture erronée, qui reste dans le journal. */
export async function correctEntry(entryId: string, reason: string, actorId: string) {
  const original = await db.query.ledgerEntries.findFirst({ where: eq(schema.ledgerEntries.id, entryId) });
  if (!original) throw new FinanceError("Écriture introuvable.");
  if (original.correctsId) throw new FinanceError("Une rectification ne se rectifie pas : saisissez une nouvelle écriture.");
  if (await db.query.ledgerEntries.findFirst({ where: eq(schema.ledgerEntries.correctsId, entryId) })) throw new FinanceError("Cette écriture a déjà été rectifiée.");
  const [row] = await db
    .insert(schema.ledgerEntries)
    .values({
      label: `Rectification de l'écriture n° ${original.number} : ${reason}`,
      direction: original.direction === "RECETTE" ? "DEPENSE" : "RECETTE",
      amount: original.amount,
      pieceRef: `RECT-${original.number}`,
      correctsId: original.id,
      createdBy: actorId,
    })
    .returning();
  return row!;
}

// ---------------------------------------------------------------------------
// Pièces de dépense (statuts, art. 22) : préparée, signée par le Trésorier, visée par le CA, puis payée.
// ---------------------------------------------------------------------------

type ExpenseStatus = (typeof schema.expenseStatus.enumValues)[number];
export const pieceRef = (n: number) => `PJ-${String(n).padStart(4, "0")}`;

export const EXPENSE_STATUS: Record<ExpenseStatus, [string, "yellow" | "green" | "red" | "gray"]> = {
  A_SIGNER: ["Signature du Trésorier en attente", "yellow"],
  A_VISER: ["Visa du CA en attente", "yellow"],
  A_PAYER: ["Visée · à payer", "green"],
  PAYEE: ["Payée", "gray"],
  REJETEE: ["Rejetée", "red"],
};

/** Pièces en cours (non payées, non rejetées), puis les 50 dernières traitées. */
export async function expenseList() {
  const withNames = { aid: { with: { member: true } }, creator: true, signer: true, approver: true } as const;
  const [open, closed, aidsWithoutPiece] = await Promise.all([
    db.query.expenses.findMany({ where: inArray(schema.expenses.status, ["A_SIGNER", "A_VISER", "A_PAYER"]), orderBy: asc(schema.expenses.number), with: withNames }),
    db.query.expenses.findMany({ where: inArray(schema.expenses.status, ["PAYEE", "REJETEE"]), orderBy: desc(schema.expenses.number), limit: 50, with: withNames }),
    db.query.solidarityRequests.findMany({
      where: and(
        eq(schema.solidarityRequests.status, "ACCORDEE"),
        sql`not exists (select 1 from expenses e where e.solidarity_request_id = ${schema.solidarityRequests.id} and e.status <> 'REJETEE')`,
      ),
      orderBy: asc(schema.solidarityRequests.decidedAt),
      with: { member: true },
    }),
  ]);
  return { open, closed, aidsWithoutPiece };
}

type Expense = typeof schema.expenses.$inferSelect;
const mailExpense = (to: string[], subject: string, text: string) =>
  sendMail({ to: [...new Set(to)].join(", "), subject, text }).catch((err) => console.error("E-mail non envoyé :", subject, err));

/** Qui franchit l'étape suivante ; à défaut (poste vacant, pas d'e-mail), l'administrateur, puis la boîte de l'association. */
const NEXT_STEP: Partial<Record<ExpenseStatus, [MandateRole[], string, string]>> = {
  A_SIGNER: [["TRESORIER"], "à signer", "attend la signature du Trésorier"],
  A_VISER: [["PRESIDENT", "VICE_PRESIDENT", "CONSEILLER"], "à viser", "est signée et attend le visa d'un membre du conseil d'administration (autre que le signataire)"],
  A_PAYER: [["COMPTABLE", "TRESORIER"], "à payer", "est signée et visée : elle peut être payée"],
};

async function notifyNextStep(e: Expense, actorId: string) {
  const step = NEXT_STEP[e.status];
  if (!step) return;
  const actor = await db.query.members.findFirst({ where: eq(schema.members.id, actorId) });
  const others = (emails: string[]) => emails.filter((m) => m !== actor?.email);
  let to = others(await responsableEmails(null, step[0]));
  if (!to.length) to = others(await responsableEmails(null, ["ADMIN_TECHNIQUE"]));
  if (!to.length) to = [env.mailAssociation];
  await mailExpense(
    to,
    `PRIDe : pièce de dépense ${pieceRef(e.number)} ${step[1]}`,
    `Bonjour,\n\nLa pièce de dépense ${pieceRef(e.number)} ${step[2]}.\n\n${e.label}\nMontant : ${formatAriary(e.amount)}\n\nÀ traiter dans l'espace Finances : ${env.appUrl}/finances/depenses\n\nStatuts, art. 22 : toute pièce de dépense est signée par le Trésorier et visée par le conseil d'administration.\n\nPRIDe`,
  );
}

function checkAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new FinanceError("Le montant doit être un nombre entier d'ariary, supérieur à zéro.");
}

export async function prepareExpense(e: { label: string; amount: number }, actorId: string) {
  checkAmount(e.amount);
  const [row] = await db.insert(schema.expenses).values({ ...e, createdBy: actorId }).returning();
  await notifyNextStep(row!, actorId);
  return row!;
}

/** Pièce de dépense pour une aide de solidarité accordée (une seule pièce en cours par aide). */
export async function prepareAidExpense(requestId: string, actorId: string) {
  const req = await db.query.solidarityRequests.findFirst({ where: eq(schema.solidarityRequests.id, requestId), with: { member: true } });
  if (!req || req.status !== "ACCORDEE") throw new FinanceError("Cette aide n'est pas à verser (déjà versée ou pas encore accordée).");
  const [row] = await db
    .insert(schema.expenses)
    .values({
      label: `Aide de solidarité : ${SOLIDARITE_EVENEMENTS[req.kind].toLowerCase()} (${SOLIDARITE_CONCERNE[req.concerns].toLowerCase()}) · ${req.member.lastName} ${req.member.firstNames} (${req.member.number})`,
      amount: req.amount,
      solidarityRequestId: req.id,
      createdBy: actorId,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new FinanceError("Une pièce de dépense est déjà en cours pour cette aide.");
  await notifyNextStep(row, actorId);
  return row;
}

/** Passage d'une étape à la suivante, seulement depuis l'étape attendue (deux clics simultanés ne font qu'un). */
async function advance(id: string, from: ExpenseStatus[], set: Partial<typeof schema.expenses.$inferInsert>, extra?: ReturnType<typeof eq>) {
  const [row] = await db
    .update(schema.expenses)
    .set(set)
    .where(and(eq(schema.expenses.id, id), inArray(schema.expenses.status, from), extra))
    .returning();
  if (!row) throw new FinanceError("Cette pièce a déjà été traitée : rechargez la page.");
  return row;
}

export async function signExpense(id: string, actorId: string) {
  const row = await advance(id, ["A_SIGNER"], { status: "A_VISER", signedBy: actorId, signedAt: new Date() });
  await notifyNextStep(row, actorId);
  return row;
}

/** Le visa du CA doit venir d'une autre personne que celle qui a signé. */
export async function approveExpense(id: string, actorId: string) {
  const e = await db.query.expenses.findFirst({ where: eq(schema.expenses.id, id) });
  if (e?.signedBy === actorId) throw new FinanceError("Vous avez signé cette pièce : le visa doit être donné par un autre membre du conseil d'administration.");
  const row = await advance(id, ["A_VISER"], { status: "A_PAYER", visaBy: actorId, visaAt: new Date() }, ne(schema.expenses.signedBy, actorId));
  await notifyNextStep(row, actorId);
  return row;
}

/** Rejet motivé : la personne qui avait préparé la pièce est prévenue. */
export async function rejectExpense(id: string, reason: string, actorId: string) {
  const row = await advance(id, ["A_SIGNER", "A_VISER"], { status: "REJETEE", rejectedBy: actorId, rejectReason: reason });
  const creator = row.createdBy !== actorId ? await db.query.members.findFirst({ where: eq(schema.members.id, row.createdBy) }) : null;
  if (creator?.email) {
    await mailExpense([creator.email], `PRIDe : pièce de dépense ${pieceRef(row.number)} rejetée`, `Bonjour ${creator.firstNames},\n\nLa pièce de dépense ${pieceRef(row.number)} (${row.label}, ${formatAriary(row.amount)}) a été rejetée.\n\nMotif : ${reason}\n\nEspace Finances : ${env.appUrl}/finances/depenses\n\nPRIDe`);
  }
  return row;
}

/** Paiement d'une pièce visée : dépense au journal ; pour une aide, demande « versée » et membre prévenu. */
export async function payExpense(id: string, actorId: string) {
  const paid = await db.transaction(async (tx) => {
    const [e] = await tx.update(schema.expenses).set({ status: "PAYEE", paidAt: new Date() }).where(and(eq(schema.expenses.id, id), eq(schema.expenses.status, "A_PAYER"))).returning();
    if (!e) throw new FinanceError("Cette pièce n'est pas à payer (pas encore visée, ou déjà payée).");
    const [entry] = await tx.insert(schema.ledgerEntries).values({ label: e.label, direction: "DEPENSE", amount: e.amount, pieceRef: pieceRef(e.number), createdBy: actorId }).returning();
    await tx.update(schema.expenses).set({ ledgerEntryId: entry!.id }).where(eq(schema.expenses.id, id));
    if (e.solidarityRequestId) {
      const [aid] = await tx
        .update(schema.solidarityRequests)
        .set({ status: "VERSEE", paidAt: new Date() })
        .where(and(eq(schema.solidarityRequests.id, e.solidarityRequestId), eq(schema.solidarityRequests.status, "ACCORDEE")))
        .returning();
      if (!aid) throw new FinanceError("Cette aide a déjà été versée.");
    }
    return { expense: e, entry: entry! };
  });
  if (paid.expense.solidarityRequestId) {
    const req = await db.query.solidarityRequests.findFirst({ where: eq(schema.solidarityRequests.id, paid.expense.solidarityRequestId), with: { member: true } });
    if (req?.member.email) {
      await sendMail({ to: req.member.email, subject: "PRIDe : votre aide de solidarité est versée", text: `Bonjour ${req.member.firstNames},\n\nL'aide de solidarité de ${formatAriary(req.amount)} vous a été versée.\n\nL'équipe PRIDe` }).catch((err) => console.error("E-mail non envoyé", err));
    }
  }
  return paid;
}

/** Membres actifs avec au moins un mois impayé avant le mois en cours. */
export async function lateMembers() {
  const period = periodOf(new Date());
  return db
    .select({ id: schema.members.id, number: schema.members.number, lastName: schema.members.lastName, firstNames: schema.members.firstNames, phone: schema.members.phone, months: sql<number>`count(*)`, total: sum(schema.dues.amount) })
    .from(schema.dues)
    .innerJoin(schema.members, eq(schema.members.id, schema.dues.memberId))
    .where(and(eq(schema.dues.status, "A_PAYER"), lt(schema.dues.period, period), eq(schema.members.status, "ACTIF")))
    .groupBy(schema.members.id)
    .orderBy(desc(sum(schema.dues.amount)));
}

export const recentPayments = () =>
  db.query.payments.findMany({ where: inArray(schema.payments.status, ["REUSSI", "EN_ATTENTE", "ECHOUE"]), orderBy: desc(schema.payments.createdAt), limit: 100, with: { member: true } });

/** Journal d'une année en CSV (séparateur « ; », lisible par Excel en français), avec les totaux. */
export async function journalCsv(year: number) {
  const rows = (await journal(year)).reverse();
  const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines = [["N°", "Date", "Libellé", "Pièce", "Recette (Ar)", "Dépense (Ar)"].map(cell).join(";")];
  let rec = 0;
  let dep = 0;
  for (const r of rows) {
    if (r.direction === "RECETTE") rec += r.amount;
    else dep += r.amount;
    lines.push([r.number, formatDate(r.date), r.label, r.pieceRef ?? "", r.direction === "RECETTE" ? r.amount : "", r.direction === "DEPENSE" ? r.amount : ""].map(cell).join(";"));
  }
  lines.push(["", "", "Totaux", "", rec, dep].map(cell).join(";"), ["", "", "Solde de l'année", "", rec - dep, ""].map(cell).join(";"));
  // BOM UTF-8 : Excel affiche correctement les accents.
  return "﻿" + lines.join("\r\n");
}
