import "server-only";
import { and, db, eq, gte, isNull, or, schema, type Tx } from "@pride/db";
import { exclusionAdopted } from "@pride/shared";
import { env } from "./env";
import { sendMail } from "./mail";
import { formatDate, formatDateTime } from "./utils";

export class MembershipError extends Error {}
type Departure = "DEMISSIONNAIRE" | "DECEDE" | "EXCLU";

const DAY = 86_400_000;
const mail = (to: string | null, subject: string, text: string) =>
  to ? sendMail({ to, subject, text }).catch((e) => console.error("E-mail non envoyé :", subject, e)) : Promise.resolve();

/**
 * Fin de la qualité de membre à la date `on` : statut, fin des mandats (dernier jour : la veille ; un mandat pas encore
 * commencé est supprimé), sortie des commissions et des demandes en attente. La carte devient invalide et l'espace membre fermé.
 */
async function endMembership(tx: Tx, memberId: string, status: Departure, on: Date, note: string) {
  const [m] = await tx
    .update(schema.members)
    .set({ status, statusChangedAt: on, statusNote: note || null })
    .where(and(eq(schema.members.id, memberId), eq(schema.members.status, "ACTIF")))
    .returning();
  if (!m) throw new MembershipError("Ce membre n'est plus actif.");
  const eve = new Date(on.getTime() - DAY);
  const running = await tx.query.mandates.findMany({
    where: and(eq(schema.mandates.memberId, memberId), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, on))),
  });
  for (const mandate of running) {
    if (new Date(mandate.startsAt) >= on) await tx.delete(schema.mandates).where(eq(schema.mandates.id, mandate.id));
    else await tx.update(schema.mandates).set({ endsAt: eve }).where(eq(schema.mandates.id, mandate.id));
  }
  await tx.delete(schema.commissionMemberships).where(eq(schema.commissionMemberships.memberId, memberId));
  await tx.delete(schema.commissionRequests).where(and(eq(schema.commissionRequests.memberId, memberId), eq(schema.commissionRequests.status, "DEMANDEE")));
  return { member: m, endedMandates: running.length };
}

/** Démission (sur demande écrite du membre) ou décès, enregistrés au registre. */
export async function recordDeparture(memberId: string, status: "DEMISSIONNAIRE" | "DECEDE", on: Date, note: string) {
  if (on > new Date()) throw new MembershipError("La date ne peut pas être dans le futur.");
  const open = await db.query.exclusionProcedures.findFirst({ where: and(eq(schema.exclusionProcedures.memberId, memberId), eq(schema.exclusionProcedures.status, "OUVERTE")) });
  return db.transaction(async (tx) => {
    // Une procédure d'exclusion en cours devient sans objet.
    if (open) await tx.update(schema.exclusionProcedures).set({ status: "REJETEE", defense: "Procédure close : départ du membre avant la décision." }).where(eq(schema.exclusionProcedures.id, open.id));
    return endMembership(tx, memberId, status, on, note);
  });
}

/** Étape 1 : motif et convocation du membre, qui peut présenter sa défense (par écrit ou lors de l'audition). */
export async function openExclusion(memberId: string, reason: string, hearingAt: Date, actorId: string) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member || member.status !== "ACTIF") throw new MembershipError("Seul un membre actif peut faire l'objet d'une procédure d'exclusion.");
  if (hearingAt <= new Date()) throw new MembershipError("L'audition doit avoir lieu dans le futur, pour laisser au membre le temps de préparer sa défense.");
  const [proc] = await db.insert(schema.exclusionProcedures).values({ memberId, reason, hearingAt, openedBy: actorId }).onConflictDoNothing().returning();
  if (!proc) throw new MembershipError("Une procédure d'exclusion est déjà en cours pour ce membre.");
  await mail(
    member.email,
    "PRIDe : procédure d'exclusion — vous pouvez présenter votre défense",
    `Bonjour ${member.firstNames},\n\nLe conseil d'administration de PRIDe envisage votre exclusion pour le motif suivant :\n\n${reason}\n\nConformément au règlement intérieur (art. 2), vous pouvez présenter votre défense, par écrit (en répondant à cet e-mail ou à ${env.mailAssociation}) ou lors de votre audition le ${formatDateTime(hearingAt)}.\n\nLa décision sera prise ensuite par le conseil d'administration, aux deux tiers des membres présents.\n\nLe conseil d'administration de PRIDe`,
  );
  return { proc, emailed: !!member.email };
}

/** Étape 2 : délibération du CA, après l'audition ; exclusion aux deux tiers des membres présents. */
export async function decideExclusion(procedureId: string, d: { meetingDate: Date; presents: number; pour: number; contre: number; defense: string }, actorId: string) {
  const proc = await db.query.exclusionProcedures.findFirst({ where: eq(schema.exclusionProcedures.id, procedureId), with: { member: true } });
  if (!proc || proc.status !== "OUVERTE") throw new MembershipError("Cette procédure n'est plus en cours.");
  const hearingDay = new Date(proc.hearingAt.toISOString().slice(0, 10));
  if (new Date() < proc.hearingAt || d.meetingDate < hearingDay) throw new MembershipError(`Le conseil ne peut délibérer qu'après l'audition du ${formatDate(proc.hearingAt)} : le membre doit avoir pu se défendre.`);
  if (d.meetingDate > new Date()) throw new MembershipError("La date de la réunion ne peut pas être dans le futur.");
  const adopted = exclusionAdopted(d.pour, d.presents);
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.exclusionProcedures)
      .set({ status: adopted ? "ADOPTEE" : "REJETEE", meetingDate: d.meetingDate, presents: d.presents, votesFor: d.pour, votesAgainst: d.contre, defense: d.defense || null, decidedBy: actorId, decidedAt: new Date() })
      .where(and(eq(schema.exclusionProcedures.id, procedureId), eq(schema.exclusionProcedures.status, "OUVERTE")))
      .returning();
    if (!updated) throw new MembershipError("Cette procédure n'est plus en cours.");
    if (adopted) await endMembership(tx, proc.memberId, "EXCLU", d.meetingDate, `Exclusion votée par le CA le ${formatDate(d.meetingDate)} : ${proc.reason}`);
  });
  await mail(
    proc.member.email,
    adopted ? "PRIDe : décision d'exclusion" : "PRIDe : la procédure d'exclusion est close",
    adopted
      ? `Bonjour ${proc.member.firstNames},\n\nLe conseil d'administration, réuni le ${formatDate(d.meetingDate)}, a prononcé votre exclusion de l'association (${d.pour} voix pour sur ${d.presents} membres présents).\n\nMotif : ${proc.reason}\n\nLe conseil d'administration de PRIDe`
      : `Bonjour ${proc.member.firstNames},\n\nLe conseil d'administration, réuni le ${formatDate(d.meetingDate)}, n'a pas retenu l'exclusion. La procédure est close et vous restez membre de l'association.\n\nLe conseil d'administration de PRIDe`,
  );
  return { adopted };
}
