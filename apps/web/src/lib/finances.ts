import "server-only";
import { and, asc, db, desc, eq, gte, inArray, lt, schema, sql, sum } from "@pride/db";
import { formatAriary, periodOf, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS } from "@pride/shared";
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
  const [month, all, [due], [paid], [late], aids] = await Promise.all([
    byDirection(gte(schema.ledgerEntries.date, start)),
    byDirection(),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(eq(schema.dues.period, period)),
    db.select({ s: sum(schema.dues.amount) }).from(schema.dues).where(and(eq(schema.dues.period, period), eq(schema.dues.status, "PAYEE"))),
    db
      .select({ members: sql<number>`count(distinct ${schema.dues.memberId})`, total: sum(schema.dues.amount) })
      .from(schema.dues)
      .innerJoin(schema.members, eq(schema.members.id, schema.dues.memberId))
      .where(and(eq(schema.dues.status, "A_PAYER"), lt(schema.dues.period, period), eq(schema.members.status, "ACTIF"))),
    db.query.solidarityRequests.findMany({ where: eq(schema.solidarityRequests.status, "ACCORDEE"), orderBy: asc(schema.solidarityRequests.decidedAt), with: { member: true } }),
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
    aidesAVerser: aids,
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

/** Nouvelle écriture validée : elle ne pourra plus être ni modifiée ni supprimée (statuts, art. 21). */
export async function addEntry(e: { date: Date; label: string; direction: Direction; amount: number; pieceRef: string }, actorId: string) {
  if (!Number.isInteger(e.amount) || e.amount <= 0) throw new FinanceError("Le montant doit être un nombre entier d'ariary, supérieur à zéro.");
  if (e.date > new Date()) throw new FinanceError("La date d'une écriture ne peut pas être dans le futur.");
  const [row] = await db.insert(schema.ledgerEntries).values({ ...e, pieceRef: e.pieceRef || null, createdBy: actorId }).returning();
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

/** Versement d'une aide de solidarité accordée : dépense au journal, demande « versée », membre prévenu. */
export async function paySolidarity(requestId: string, pieceRef: string, actorId: string) {
  const req = await db.query.solidarityRequests.findFirst({ where: eq(schema.solidarityRequests.id, requestId), with: { member: true } });
  if (!req || req.status !== "ACCORDEE") throw new FinanceError("Cette aide n'est pas à verser (déjà versée ou pas encore accordée).");
  await db.transaction(async (tx) => {
    const [done] = await tx
      .update(schema.solidarityRequests)
      .set({ status: "VERSEE", paidAt: new Date() })
      .where(and(eq(schema.solidarityRequests.id, requestId), eq(schema.solidarityRequests.status, "ACCORDEE")))
      .returning();
    if (!done) throw new FinanceError("Cette aide vient d'être versée par quelqu'un d'autre.");
    await tx.insert(schema.ledgerEntries).values({
      label: `Aide de solidarité : ${SOLIDARITE_EVENEMENTS[req.kind].toLowerCase()} (${SOLIDARITE_CONCERNE[req.concerns].toLowerCase()}) · ${req.member.number}`,
      direction: "DEPENSE",
      amount: req.amount,
      pieceRef: pieceRef || `AIDE-${req.id.slice(0, 8)}`,
      createdBy: actorId,
    });
  });
  if (req.member.email) {
    await sendMail({ to: req.member.email, subject: "PRIDe : votre aide de solidarité est versée", text: `Bonjour ${req.member.firstNames},\n\nL'aide de solidarité de ${formatAriary(req.amount)} vous a été versée.\n\nL'équipe PRIDe` }).catch((e) => console.error("E-mail non envoyé", e));
  }
  return req;
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
