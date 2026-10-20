import "server-only";
import { and, asc, db, desc, eq, inArray, nextCounter, schema } from "@pride/db";
import {
  agCanDeliberate,
  canVoteAtAG,
  convocationDelay,
  quorumAG,
  resolutionAdopted,
  voteValid,
  type Majorite,
  type VoteResult,
} from "@pride/shared";
import { env } from "./env";
import { sendMail } from "./mail";
import { formatDateTime, slugify } from "./utils";

export class AssemblyError extends Error {}

type Status = (typeof schema.assemblyStatus.enumValues)[number];

export const ASSEMBLY_STATUS: Record<Status, [string, "green" | "yellow" | "red" | "gray" | "dark"]> = {
  PREPARATION: ["En préparation", "gray"],
  CONVOQUEE: ["Convoquée", "yellow"],
  EN_SEANCE: ["En séance", "green"],
  CLOTUREE: ["Clôturée", "dark"],
  CARENCE: ["Quorum non atteint", "red"],
};

export const KIND_LABELS = { ORDINAIRE: "Assemblée générale ordinaire", EXTRAORDINAIRE: "Assemblée générale extraordinaire" } as const;

export async function listAssemblies(statuses?: Status[]) {
  return db.query.assemblies.findMany({
    where: statuses ? inArray(schema.assemblies.status, statuses) : undefined,
    orderBy: desc(schema.assemblies.scheduledAt),
    with: { resolutions: true },
  });
}

export async function getAssembly(id: string) {
  const a = await db.query.assemblies.findFirst({
    where: eq(schema.assemblies.id, id),
    with: {
      president: true,
      secretary: true,
      previous: true,
      resolutions: { orderBy: asc(schema.resolutions.position) },
      attendances: { with: { member: true }, orderBy: asc(schema.assemblyAttendances.signedAt) },
    },
  });
  if (!a) return null;
  const presentVoters = a.attendances.filter((x) => x.canVote).length;
  const canDeliberate = a.eligibleVoters != null && agCanDeliberate(presentVoters, a.eligibleVoters, a.convocationNumber);
  const next = await db.query.assemblies.findFirst({ where: eq(schema.assemblies.previousId, a.id) });
  return { ...a, presentVoters, canDeliberate, next: next ?? null };
}

export type AssemblyDetail = NonNullable<Awaited<ReturnType<typeof getAssembly>>>;

async function load(id: string, allowed: Status[], action: string) {
  const a = await db.query.assemblies.findFirst({ where: eq(schema.assemblies.id, id) });
  if (!a) throw new AssemblyError("Assemblée générale introuvable.");
  if (!allowed.includes(a.status)) throw new AssemblyError(`${action} impossible : l'AG est « ${ASSEMBLY_STATUS[a.status][0].toLowerCase()} ».`);
  return a;
}

/** Membres ayant le droit de vote aujourd'hui (actifs majeurs, sans procuration). */
export async function eligibleVoters() {
  const actifs = await db.query.members.findMany({ where: eq(schema.members.status, "ACTIF") });
  return actifs.filter((m) => canVoteAtAG(m));
}

export type AssemblyInput = { kind: "ORDINAIRE" | "EXTRAORDINAIRE"; title: string; scheduledAt: Date; location: string; agenda: string };

export async function createAssembly(input: AssemblyInput, actorId: string) {
  const year = input.scheduledAt.getFullYear();
  const reference = `AG-${year}-${String(await nextCounter(`ag-${year}`)).padStart(2, "0")}`;
  const [a] = await db.insert(schema.assemblies).values({ ...input, reference, createdBy: actorId }).returning();
  return a!;
}

export async function updateAssembly(id: string, input: AssemblyInput) {
  await load(id, ["PREPARATION"], "Modification");
  await db.update(schema.assemblies).set(input).where(eq(schema.assemblies.id, id));
}

export async function addResolution(assemblyId: string, input: { title: string; text: string; majority: Majorite }) {
  await load(assemblyId, ["PREPARATION", "CONVOQUEE"], "Ajout d'une résolution");
  const existing = await db.query.resolutions.findMany({ where: eq(schema.resolutions.assemblyId, assemblyId) });
  const position = Math.max(0, ...existing.map((r) => r.position)) + 1;
  await db.insert(schema.resolutions).values({ assemblyId, position, ...input });
}

export async function removeResolution(resolutionId: string) {
  const r = await db.query.resolutions.findFirst({ where: eq(schema.resolutions.id, resolutionId) });
  if (!r) throw new AssemblyError("Résolution introuvable.");
  await load(r.assemblyId, ["PREPARATION", "CONVOQUEE"], "Retrait d'une résolution");
  await db.delete(schema.resolutions).where(eq(schema.resolutions.id, resolutionId));
  return r;
}

/**
 * Envoie la convocation par e-mail à tous les membres actifs (les mineurs et bienfaiteurs peuvent assister)
 * et la publie dans l'espace membres. Renvoie le nombre d'e-mails et le délai avant la réunion.
 */
export async function convoke(id: string, actorId: string) {
  const a = await load(id, ["PREPARATION"], "Convocation");
  const resolutions = await db.query.resolutions.findMany({ where: eq(schema.resolutions.assemblyId, id), orderBy: asc(schema.resolutions.position) });
  const now = new Date();
  const delay = convocationDelay(now, a.scheduledAt);
  if (delay.days < 0) throw new AssemblyError("La date de l'AG est déjà passée : modifiez-la avant de convoquer.");

  const when = formatDateTime(a.scheduledAt);
  const second = a.convocationNumber >= 2;
  const body = [
    `${KIND_LABELS[a.kind]}${second ? " — deuxième convocation" : ""}`,
    `Le ${when}, ${a.location}.`,
    "",
    "Ordre du jour :",
    a.agenda,
    ...(resolutions.length ? ["", "Résolutions soumises au vote :", ...resolutions.map((r) => `${r.position}. ${r.title}`)] : []),
    "",
    second
      ? "Le quorum n'ayant pas été atteint lors de la première convocation, l'assemblée délibérera valablement quel que soit le nombre de membres présents."
      : "L'assemblée délibère valablement si la majorité absolue des membres ayant droit de vote est présente. Les procurations ne sont pas admises.",
    "Les membres actifs mineurs et les membres bienfaiteurs peuvent assister, sans prendre part au vote.",
  ].join("\n");

  const members = await db.query.members.findMany({ where: eq(schema.members.status, "ACTIF") });
  const recipients = members.filter((m) => m.email);
  let sent = 0;
  for (const m of recipients) {
    await sendMail({ to: m.email!, subject: `PRIDe : convocation à l'${KIND_LABELS[a.kind].toLowerCase()} du ${when}`, text: `Bonjour ${m.firstNames},\n\n${body}\n\nDétails dans votre espace membre : ${env.appUrl}/membre/ag/${a.id}\n\nLe conseil d'administration de PRIDe` })
      .then(() => sent++)
      .catch((e) => console.error("Convocation non envoyée à", m.email, e));
  }

  await db.transaction(async (tx) => {
    await tx.update(schema.assemblies).set({ status: "CONVOQUEE", convokedAt: now, convocationsSent: sent }).where(eq(schema.assemblies.id, id));
    await tx.insert(schema.posts).values({
      slug: `${slugify(a.reference)}-convocation-${Date.now().toString(36)}`,
      type: "EVENEMENT",
      title: `Convocation : ${a.title}`,
      excerpt: `${KIND_LABELS[a.kind]}${second ? " (deuxième convocation)" : ""} le ${when}, ${a.location}.`,
      body,
      visibility: "MEMBRES",
      eventAt: a.scheduledAt,
      location: a.location,
      authorId: actorId,
    });
  });
  return { sent, recipients: recipients.length, members: members.length, delay };
}

/** Ouvre la séance : le nombre de membres ayant droit de vote et le quorum sont figés. */
export async function openSession(id: string, presidentId: string, secretaryId: string) {
  await load(id, ["CONVOQUEE"], "Ouverture de la séance");
  if (presidentId === secretaryId) throw new AssemblyError("La présidence et le secrétariat de séance doivent être assurés par deux personnes différentes.");
  const eligible = (await eligibleVoters()).length;
  if (eligible === 0) throw new AssemblyError("Aucun membre n'a le droit de vote.");
  await db
    .update(schema.assemblies)
    .set({ status: "EN_SEANCE", openedAt: new Date(), eligibleVoters: eligible, quorum: quorumAG(eligible), presidentId, secretaryId })
    .where(eq(schema.assemblies.id, id));
  return { eligible, quorum: quorumAG(eligible) };
}

/** Émargement : le droit de vote est vérifié au moment de la signature. */
export async function signAttendance(id: string, memberId: string) {
  await load(id, ["EN_SEANCE"], "Émargement");
  const m = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!m || m.status !== "ACTIF") throw new AssemblyError("Seul un membre actif peut émarger.");
  const [row] = await db.insert(schema.assemblyAttendances).values({ assemblyId: id, memberId, canVote: canVoteAtAG(m) }).onConflictDoNothing().returning();
  if (!row) throw new AssemblyError("Ce membre a déjà émargé.");
  return row;
}

export async function removeAttendance(id: string, memberId: string) {
  await load(id, ["EN_SEANCE"], "Correction de l'émargement");
  await db.delete(schema.assemblyAttendances).where(and(eq(schema.assemblyAttendances.assemblyId, id), eq(schema.assemblyAttendances.memberId, memberId)));
}

/** Enregistre le décompte d'une résolution (peut être corrigé tant que la séance n'est pas clôturée). */
export async function recordVote(resolutionId: string, vote: VoteResult) {
  const r = await db.query.resolutions.findFirst({ where: eq(schema.resolutions.id, resolutionId) });
  if (!r) throw new AssemblyError("Résolution introuvable.");
  await load(r.assemblyId, ["EN_SEANCE"], "Vote");
  const a = (await getAssembly(r.assemblyId))!;
  if (!a.canDeliberate) throw new AssemblyError(`Quorum non atteint : ${a.presentVoters} votant(s) présent(s) sur ${a.quorum} requis. L'assemblée ne peut pas voter.`);
  if (!voteValid(vote, a.presentVoters)) throw new AssemblyError(`Décompte incohérent : ${vote.pour + vote.contre + vote.abstention} bulletin(s) pour ${a.presentVoters} votant(s) présent(s).`);
  const adopted = resolutionAdopted(r.majority, vote, a.presentVoters);
  await db
    .update(schema.resolutions)
    .set({ voters: a.presentVoters, votesFor: vote.pour, votesAgainst: vote.contre, abstentions: vote.abstention, adopted, votedAt: new Date() })
    .where(eq(schema.resolutions.id, resolutionId));
  return { resolution: r, adopted, voters: a.presentVoters };
}

/** Quorum non atteint sur première convocation : l'AG ne délibère pas, un PV de carence est établi. */
export async function declareCarence(id: string, notes: string) {
  await load(id, ["EN_SEANCE"], "Constat de carence");
  const a = (await getAssembly(id))!;
  if (a.convocationNumber >= 2) throw new AssemblyError("Sur deuxième convocation, l'assemblée délibère sans condition de quorum.");
  if (a.canDeliberate) throw new AssemblyError("Le quorum est atteint : l'assemblée peut délibérer.");
  await db.update(schema.assemblies).set({ status: "CARENCE", closedAt: new Date(), notes: notes || null }).where(eq(schema.assemblies.id, id));
}

/** Après une carence : deuxième AG, même ordre du jour et mêmes résolutions, sans condition de quorum. */
export async function secondConvocation(id: string, scheduledAt: Date, actorId: string) {
  const a = await load(id, ["CARENCE"], "Deuxième convocation");
  const existing = await db.query.assemblies.findFirst({ where: eq(schema.assemblies.previousId, id) });
  if (existing) throw new AssemblyError(`La deuxième convocation existe déjà (${existing.reference}).`);
  if (scheduledAt <= new Date()) throw new AssemblyError("La date de la deuxième AG doit être dans le futur.");
  const resolutions = await db.query.resolutions.findMany({ where: eq(schema.resolutions.assemblyId, id) });
  const next = await createAssembly({ kind: a.kind, title: a.title, scheduledAt, location: a.location, agenda: a.agenda }, actorId);
  await db.update(schema.assemblies).set({ convocationNumber: 2, previousId: id }).where(eq(schema.assemblies.id, next.id));
  if (resolutions.length) {
    await db.insert(schema.resolutions).values(resolutions.map((r) => ({ assemblyId: next.id, position: r.position, title: r.title, text: r.text, majority: r.majority })));
  }
  return next;
}

/** Clôture : toutes les résolutions doivent avoir été votées. Le PV devient définitif. */
export async function closeSession(id: string, notes: string) {
  await load(id, ["EN_SEANCE"], "Clôture");
  const a = (await getAssembly(id))!;
  if (!a.canDeliberate) throw new AssemblyError("Quorum non atteint : constatez la carence au lieu de clôturer.");
  const pending = a.resolutions.filter((r) => r.adopted === null);
  if (pending.length) throw new AssemblyError(`Résolution(s) non votée(s) : ${pending.map((r) => r.position).join(", ")}.`);
  await db.update(schema.assemblies).set({ status: "CLOTUREE", closedAt: new Date(), notes: notes || null }).where(eq(schema.assemblies.id, id));
}
