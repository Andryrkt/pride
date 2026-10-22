import "server-only";
import { and, asc, db, eq, gte, inArray, isNull, lte, or, schema } from "@pride/db";
import { DUREE_MANDAT_COMMISSION, mandateActive, mandateEnd } from "@pride/shared";

export class CommissionError extends Error {}

const DAY = 24 * 60 * 60 * 1000;
const today = () => new Date(new Date().toISOString().slice(0, 10));

/** Mandats de responsable en cours ou à venir pour une commission. */
const openResponsableMandates = (commissionId: string, on: Date) =>
  and(
    eq(schema.mandates.role, "RESPONSABLE_COMMISSION"),
    eq(schema.mandates.commissionId, commissionId),
    or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, on)),
  );

/** Les commissions avec leurs membres et l'historique des responsables. */
export async function listCommissions() {
  const rows = await db.query.commissions.findMany({
    orderBy: asc(schema.commissions.name),
    with: {
      memberships: { with: { member: true } },
      mandates: { where: eq(schema.mandates.role, "RESPONSABLE_COMMISSION"), with: { member: true }, orderBy: asc(schema.mandates.startsAt) },
    },
  });
  return rows.map((c) => ({ ...c, responsable: c.mandates.find((m) => mandateActive(m)) ?? null, lastMandate: c.mandates.at(-1) ?? null }));
}

export async function getCommission(slug: string) {
  const all = await listCommissions();
  return all.find((c) => c.slug === slug) ?? null;
}

/**
 * Désigne le responsable d'une commission pour un an.
 * Le mandat du responsable précédent se termine la veille ; le nouveau responsable devient membre de la commission.
 */
export async function designateResponsable(commissionId: string, memberId: string, startsAt: Date) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member) throw new CommissionError("Membre introuvable.");
  if (member.status !== "ACTIF") throw new CommissionError("Seul un membre actif peut être désigné responsable.");

  return db.transaction(async (tx) => {
    const open = await tx.query.mandates.findMany({ where: openResponsableMandates(commissionId, startsAt) });
    if (open.some((m) => m.memberId === memberId)) throw new CommissionError("Ce membre est déjà responsable de la commission à cette date.");
    // Un mandat qui commence le même jour est annulé (correction d'une désignation) ; un mandat déjà prévu plus tard bloque.
    if (open.some((m) => new Date(m.startsAt) > startsAt)) throw new CommissionError("Un autre mandat est déjà prévu après cette date : choisissez une date postérieure.");
    const eve = new Date(startsAt.getTime() - DAY);
    for (const m of open) await tx.update(schema.mandates).set({ endsAt: eve }).where(eq(schema.mandates.id, m.id));

    const [mandate] = await tx
      .insert(schema.mandates)
      .values({ memberId, role: "RESPONSABLE_COMMISSION", commissionId, startsAt, endsAt: mandateEnd(startsAt, DUREE_MANDAT_COMMISSION) })
      .returning();
    await tx.insert(schema.commissionMemberships).values({ memberId, commissionId }).onConflictDoNothing();
    return { mandate: mandate!, replaced: open.map((m) => m.id) };
  });
}

/** Met fin au mandat en cours (dernier jour : hier). */
export async function endResponsableMandate(mandateId: string) {
  const m = await db.query.mandates.findFirst({ where: eq(schema.mandates.id, mandateId) });
  if (!m || m.role !== "RESPONSABLE_COMMISSION") throw new CommissionError("Mandat introuvable.");
  if (!mandateActive(m)) throw new CommissionError("Ce mandat n'est plus en cours.");
  await db.update(schema.mandates).set({ endsAt: new Date(today().getTime() - DAY) }).where(eq(schema.mandates.id, mandateId));
  return m;
}

export async function addCommissionMember(commissionId: string, memberId: string) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member || member.status !== "ACTIF") throw new CommissionError("Seul un membre actif peut rejoindre une commission.");
  const [row] = await db.insert(schema.commissionMemberships).values({ memberId, commissionId }).onConflictDoNothing().returning();
  if (!row) throw new CommissionError("Ce membre fait déjà partie de la commission.");
}

export async function removeCommissionMember(commissionId: string, memberId: string) {
  const open = await db.query.mandates.findMany({ where: and(openResponsableMandates(commissionId, today()), eq(schema.mandates.memberId, memberId)) });
  if (open.length) throw new CommissionError("Ce membre est responsable de la commission : mettez d'abord fin à son mandat.");
  await db
    .delete(schema.commissionMemberships)
    .where(and(eq(schema.commissionMemberships.commissionId, commissionId), eq(schema.commissionMemberships.memberId, memberId)));
}

/** E-mails des responsables en fonction aujourd'hui d'une commission (par son slug), et des autres rôles demandés (ex. Trésorier). */
export async function responsableEmails(slug: string, extraRoles: ("TRESORIER" | "COORDONNATEUR")[] = []) {
  const now = new Date();
  const mandates = await db.query.mandates.findMany({
    where: and(
      inArray(schema.mandates.role, ["RESPONSABLE_COMMISSION", ...extraRoles]),
      lte(schema.mandates.startsAt, now),
      or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, now)),
    ),
    with: { member: true, commission: true },
  });
  return mandates
    .filter((m) => m.role !== "RESPONSABLE_COMMISSION" || m.commission?.slug === slug)
    .flatMap((m) => (m.member.email ? [m.member.email] : []));
}
