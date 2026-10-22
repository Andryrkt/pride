import "server-only";
import { and, db, eq, schema } from "@pride/db";
import { OFFER_TYPES, type OfferType } from "@pride/shared";
import { responsableEmails } from "./commissions";
import { env } from "./env";
import { sendMail } from "./mail";

/**
 * Le réseau des membres : offres (stages, emplois, bénévolat), coups de main entre membres,
 * demandes d'entrée en commission, propositions d'ateliers et de projets.
 */
type Member = typeof schema.members.$inferSelect;
export class NetworkError extends Error {}

const who = (m: Member) => `${m.firstNames} ${m.lastName} (${m.number})`;
const contact = (m: Member) => [m.phone && `Téléphone : ${m.phone}`, m.email && `E-mail : ${m.email}`].filter(Boolean).join("\n");
const mail = (to: string[], subject: string, text: string) =>
  sendMail({ to: [...new Set(to)].join(", "), subject, text }).catch((e) => console.error("E-mail non envoyé :", subject, e));

// --- Offres -----------------------------------------------------------------

export const OFFER_STATUS = {
  PROPOSEE: ["En attente de validation", "yellow"],
  PUBLIEE: ["Publiée", "green"],
  REFUSEE: ["Refusée", "red"],
  CLOTUREE: ["Clôturée", "gray"],
} as const;

export async function proposeOffer(author: Member, input: { type: OfferType; title: string; description: string; location?: string }) {
  const [offer] = await db.insert(schema.offers).values({ authorId: author.id, ...input, location: input.location || null }).returning();
  await mail([env.mailAssociation], `Offre à valider : ${input.title}`, `${who(author)} propose une offre (${OFFER_TYPES[input.type]}) :\n\n${input.title}\n${input.description}\n\nÀ valider dans l'espace dirigeants : ${env.appUrl}/dirigeants/offres`);
  return offer!;
}

/** Validation par un dirigeant ; une offre déjà traitée ne change plus. */
export async function decideOffer(id: string, decision: "PUBLIEE" | "REFUSEE", note: string, actorId: string) {
  const [offer] = await db
    .update(schema.offers)
    .set({ status: decision, decisionNote: note || null, decidedAt: new Date(), decidedBy: actorId })
    .where(and(eq(schema.offers.id, id), eq(schema.offers.status, "PROPOSEE")))
    .returning();
  if (!offer) throw new NetworkError("Cette offre a déjà été traitée.");
  const author = await db.query.members.findFirst({ where: eq(schema.members.id, offer.authorId) });
  if (author?.email) {
    await mail(
      [author.email],
      decision === "PUBLIEE" ? `PRIDe : votre offre « ${offer.title} » est publiée` : `PRIDe : votre offre « ${offer.title} » n'est pas publiée`,
      `Bonjour ${author.firstNames},\n\n${decision === "PUBLIEE" ? "Votre offre est maintenant visible par tous les membres. Vous recevrez un e-mail pour chaque membre intéressé." : "Votre offre n'a pas été publiée."}${note ? `\n\n${note}` : ""}\n\nL'équipe PRIDe`,
    );
  }
  return offer;
}

/** L'auteur (ou un dirigeant) clôture une offre pourvue : elle disparaît de la liste. */
export async function closeOffer(id: string, by: { memberId: string; isLeader: boolean }) {
  const offer = await db.query.offers.findFirst({ where: eq(schema.offers.id, id) });
  if (!offer || offer.status !== "PUBLIEE") throw new NetworkError("Cette offre n'est pas publiée.");
  if (offer.authorId !== by.memberId && !by.isLeader) throw new NetworkError("Seul l'auteur de l'offre ou un dirigeant peut la clôturer.");
  await db.update(schema.offers).set({ status: "CLOTUREE" }).where(eq(schema.offers.id, id));
}

/** « Je suis intéressé(e) » : les coordonnées du membre partent par e-mail à l'auteur de l'offre. */
export async function expressInterest(offerId: string, member: Member) {
  const offer = await db.query.offers.findFirst({ where: eq(schema.offers.id, offerId), with: { author: true } });
  if (!offer || offer.status !== "PUBLIEE") throw new NetworkError("Cette offre n'est plus disponible.");
  if (offer.authorId === member.id) throw new NetworkError("C'est votre propre offre.");
  const [row] = await db.insert(schema.offerInterests).values({ offerId, memberId: member.id }).onConflictDoNothing().returning();
  if (!row) throw new NetworkError("Vous avez déjà signalé votre intérêt pour cette offre.");
  await mail(
    [offer.author.email ?? env.mailAssociation],
    `PRIDe : un membre est intéressé par « ${offer.title} »`,
    `Bonjour ${offer.author.firstNames},\n\n${who(member)} est intéressé(e) par votre offre « ${offer.title} ».${member.profession ? `\nProfession ou études : ${member.profession}` : ""}\n\n${contact(member)}\n\nL'équipe PRIDe`,
  );
}

// --- Annuaire des compétences ----------------------------------------------

/** « Demander un coup de main » : une seule demande par membre aidé, envoyée avec les coordonnées du demandeur. */
export async function askHelp(from: Member, toId: string) {
  if (toId === from.id) throw new NetworkError("Vous ne pouvez pas vous demander un coup de main.");
  const to = await db.query.members.findFirst({ where: eq(schema.members.id, toId) });
  if (!to || to.status !== "ACTIF" || !to.shareSkills) throw new NetworkError("Ce membre n'est plus dans l'annuaire.");
  const [row] = await db.insert(schema.helpRequests).values({ fromId: from.id, toId }).onConflictDoNothing().returning();
  if (!row) throw new NetworkError("Vous avez déjà contacté ce membre.");
  await mail(
    [to.email ?? env.mailAssociation],
    `PRIDe : ${from.firstNames} vous demande un coup de main`,
    `Bonjour ${to.firstNames},\n\n${who(from)} a vu vos compétences (${to.skills.join(", ")}) dans l'annuaire des membres et aimerait votre aide.\n\n${contact(from)}\n\nRépondez-lui directement si vous le pouvez. Merci pour le partage !\n\nL'équipe PRIDe`,
  );
}

// --- Commissions -------------------------------------------------------------

export async function requestCommission(member: Member, commissionId: string) {
  const commission = await db.query.commissions.findFirst({ where: eq(schema.commissions.id, commissionId) });
  if (!commission) throw new NetworkError("Commission introuvable.");
  if (member.status !== "ACTIF") throw new NetworkError("Seul un membre actif peut rejoindre une commission.");
  const already = await db.query.commissionMemberships.findFirst({
    where: and(eq(schema.commissionMemberships.memberId, member.id), eq(schema.commissionMemberships.commissionId, commissionId)),
  });
  if (already) throw new NetworkError("Vous faites déjà partie de cette commission.");
  const [row] = await db.insert(schema.commissionRequests).values({ memberId: member.id, commissionId }).onConflictDoNothing().returning();
  if (!row) throw new NetworkError("Votre demande est déjà en attente.");
  await mail(
    [env.mailAssociation, ...(await responsableEmails(commission.slug))],
    `Demande d'entrée dans la commission ${commission.name}`,
    `${who(member)} souhaite rejoindre la commission ${commission.name}.${member.skills.length ? `\nCompétences : ${member.skills.join(", ")}` : ""}\n\nÀ accepter ou refuser dans l'espace dirigeants : ${env.appUrl}/dirigeants/commissions/${commission.slug}`,
  );
}

export async function decideCommissionRequest(id: string, accept: boolean, actorId: string) {
  const pending = await db.query.commissionRequests.findFirst({ where: eq(schema.commissionRequests.id, id), with: { member: true } });
  if (accept && pending?.member.status !== "ACTIF") throw new NetworkError("Ce membre n'est plus actif : refusez la demande.");
  const [req] = await db
    .update(schema.commissionRequests)
    .set({ status: accept ? "ACCEPTEE" : "REFUSEE", decidedBy: actorId, decidedAt: new Date() })
    .where(and(eq(schema.commissionRequests.id, id), eq(schema.commissionRequests.status, "DEMANDEE")))
    .returning();
  if (!req) throw new NetworkError("Cette demande a déjà été traitée.");
  if (accept) await db.insert(schema.commissionMemberships).values({ memberId: req.memberId, commissionId: req.commissionId }).onConflictDoNothing();
  const [member, commission] = await Promise.all([
    db.query.members.findFirst({ where: eq(schema.members.id, req.memberId) }),
    db.query.commissions.findFirst({ where: eq(schema.commissions.id, req.commissionId) }),
  ]);
  if (member?.email && commission) {
    await mail(
      [member.email],
      `PRIDe : commission ${commission.name}`,
      `Bonjour ${member.firstNames},\n\n${accept ? `Bienvenue dans la commission ${commission.name} ! Son responsable vous contactera pour les prochaines activités.` : `Votre demande pour rejoindre la commission ${commission.name} n'a pas été retenue pour le moment.`}\n\nL'équipe PRIDe`,
    );
  }
  return req;
}

// --- Propositions d'ateliers et de projets ------------------------------------

const PROPOSAL_LABELS = { ATELIER: "Proposition d'atelier", PROJET: "Idée de projet" } as const;

/** Transmise à la Commission formation et projets (et à l'association, qui la porte au CA pour un projet) ; gardée dans les messages. */
export async function sendProposal(member: Member, input: { kind: "ATELIER" | "PROJET"; title: string; details: string }) {
  const label = PROPOSAL_LABELS[input.kind];
  const subject = `${label} : ${input.title}`;
  await db.insert(schema.contactMessages).values({ name: who(member), email: member.email ?? env.mailAssociation, phone: member.phone, subject, message: input.details });
  await mail([env.mailAssociation, ...(await responsableEmails("formation-projets"))], `[Espace membres] ${subject}`, `${label} de ${who(member)} :\n\n${input.title}\n\n${input.details}\n\n${contact(member)}`);
}
