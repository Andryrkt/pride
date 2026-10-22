import "server-only";
import { hashPassword } from "better-auth/crypto";
import { and, db, eq, nextCounter, schema } from "@pride/db";
import {
  ACCEPTED_UPLOAD_TYPES,
  agrementAdopted,
  DOCUMENT_KINDS,
  entryFee,
  isMinor,
  MAX_UPLOAD_BYTES,
  memberCounterPeriod,
  memberNumber,
  monthlyFee,
  periodOf,
  type ApplicationInput,
  type DocumentKind,
} from "@pride/shared";
import { auth } from "./auth";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";

export type UploadedDoc = { kind: DocumentKind; file: File };

/** Pièces obligatoires (règlement intérieur, art. 1) selon l'âge du candidat. */
export function requiredDocuments(minor: boolean): DocumentKind[] {
  return ["RESIDENCE", minor ? "ACTE_NAISSANCE" : "CIN", "CV", "LETTRE"];
}

export function validateFile(file: File | null | undefined): string | null {
  if (!file || file.size === 0) return "Fichier manquant";
  if (file.size > MAX_UPLOAD_BYTES) return "Fichier trop lourd (5 Mo maximum)";
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) return "Format accepté : PDF, JPG, PNG ou WEBP";
  return null;
}

function extension(file: File) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(file.name);
  return m ? m[1]!.toLowerCase() : "bin";
}

/** Enregistre une candidature, ses pièces jointes, et prévient l'association. */
export async function createApplication(input: ApplicationInput, docs: UploadedDoc[]) {
  const minor = isMinor(input.birthDate);
  const year = new Date().getFullYear();
  const reference = `C-${year}-${String(await nextCounter(`application-${year}`)).padStart(4, "0")}`;

  const stored: { kind: DocumentKind; storageKey: string; filename: string; mimeType: string; size: number }[] = [];
  for (const d of docs) {
    const key = `candidatures/${reference}/${d.kind.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}.${extension(d.file)}`;
    await putFile(key, Buffer.from(await d.file.arrayBuffer()), d.file.type);
    stored.push({ kind: d.kind, storageKey: key, filename: d.file.name, mimeType: d.file.type, size: d.file.size });
  }

  const application = await db.transaction(async (tx) => {
    const [a] = await tx
      .insert(schema.applications)
      .values({
        reference,
        status: input.sponsorship === "ENTRETIEN" ? "ENTRETIEN" : "SOUMISE",
        lastName: input.lastName.toUpperCase(),
        firstNames: input.firstNames,
        birthDate: input.birthDate,
        phone: input.phone,
        email: input.email,
        address: input.address,
        profession: input.profession,
        skills: input.skills,
        expectations: input.expectations,
        category: minor ? "ACTIF_MINEUR" : input.category,
        sponsorship: input.sponsorship,
        sponsorId: input.sponsorship === "PARRAIN" ? input.sponsorMemberId : null,
        parentName: minor ? input.parentName : null,
        parentMemberNumber: minor ? input.parentMemberNumber : null,
      })
      .returning();
    await tx.insert(schema.applicationDocuments).values(stored.map((d) => ({ ...d, applicationId: a!.id })));
    return a!;
  });

  await sendMail({
    to: env.mailAssociation,
    subject: `Nouvelle candidature ${reference} : ${application.lastName} ${application.firstNames}`,
    text: `Une nouvelle candidature a été déposée sur le site.\n\nRéférence : ${reference}\nNom : ${application.lastName} ${application.firstNames}\nTéléphone : ${application.phone}\nParrainage : ${input.sponsorship === "PARRAIN" ? "parrain au CA" : "demande d'entretien"}\n\nÀ traiter dans l'espace dirigeants : ${env.appUrl}/dirigeants/adhesions/${application.id}`,
  }).catch((e) => console.error("E-mail association non envoyé", e));

  if (application.email) {
    await sendMail({
      to: application.email,
      subject: `PRIDe : votre candidature ${reference} est bien reçue`,
      text: `Bonjour ${application.firstNames},\n\nNous avons bien reçu votre candidature (référence ${reference}).\nÉtapes suivantes : ${input.sponsorship === "ENTRETIEN" ? "entretien avec deux membres du conseil d'administration, puis " : ""}décision du conseil d'administration, puis paiement du droit d'entrée et de la première cotisation.\n\nMerci de votre intérêt pour PRIDe !`,
    }).catch((e) => console.error("E-mail candidat non envoyé", e));
  }
  return application;
}

export class ApplicationError extends Error {}

export async function sendToVote(applicationId: string) {
  const a = await db.query.applications.findFirst({ where: eq(schema.applications.id, applicationId) });
  if (!a || !["SOUMISE", "ENTRETIEN"].includes(a.status)) throw new ApplicationError("Cette candidature ne peut pas être soumise au vote.");
  await db.update(schema.applications).set({ status: "VOTE_CA" }).where(eq(schema.applications.id, applicationId));
}

export async function scheduleInterview(applicationId: string, at: Date) {
  await db
    .update(schema.applications)
    .set({ interviewAt: at, status: "ENTRETIEN" })
    .where(and(eq(schema.applications.id, applicationId)));
}

/** Délibération du CA : agrément à la majorité des membres présents (règlement intérieur, art. 1). */
export async function recordDecision(applicationId: string, d: { meetingDate: Date; presents: number; pour: number; contre: number }, actorId: string) {
  const a = await db.query.applications.findFirst({ where: eq(schema.applications.id, applicationId) });
  if (!a || a.status !== "VOTE_CA") throw new ApplicationError("La candidature doit d'abord être soumise au vote du conseil.");
  const adopted = agrementAdopted(d.pour, d.presents);
  await db
    .update(schema.applications)
    .set({
      status: adopted ? "AGREEE" : "REFUSEE",
      meetingDate: d.meetingDate,
      presents: d.presents,
      votesFor: d.pour,
      votesAgainst: d.contre,
      decidedAt: new Date(),
      decidedBy: actorId,
    })
    .where(eq(schema.applications.id, applicationId));
  if (a.email) {
    await sendMail({
      to: a.email,
      subject: adopted ? "PRIDe : votre adhésion est acceptée" : "PRIDe : réponse à votre candidature",
      text: adopted
        ? `Bonjour ${a.firstNames},\n\nLe conseil d'administration a agréé votre adhésion. Il reste à régler le droit d'entrée (${entryFee(a.category)} Ar) et la première cotisation. Vous recevrez ensuite l'accès à votre espace membre.\n\nBienvenue chez PRIDe !`
        : `Bonjour ${a.firstNames},\n\nLe conseil d'administration n'a pas donné suite à votre candidature. N'hésitez pas à nous contacter pour en parler.\n\nL'équipe PRIDe`,
    }).catch(() => undefined);
  }
  return adopted;
}

/**
 * Crée la fiche membre après l'agrément : numéro, droit d'entrée et première cotisation à payer,
 * et compte de connexion si le candidat a un e-mail (il reçoit un lien pour choisir son mot de passe).
 */
export async function createMemberFromApplication(applicationId: string, actorId: string) {
  const a = await db.query.applications.findFirst({ where: eq(schema.applications.id, applicationId) });
  if (!a || a.status !== "AGREEE") throw new ApplicationError("Seule une candidature agréée peut devenir membre.");

  const member = await db.transaction(async (tx) => {
    const now = new Date();
    const number = memberNumber(now, await nextCounter(`member-${memberCounterPeriod(now)}`, tx));
    let parentId: string | null = null;
    if (a.parentMemberNumber) {
      const parent = await tx.query.members.findFirst({ where: eq(schema.members.number, a.parentMemberNumber) });
      parentId = parent?.id ?? null;
    }
    let userId: string | null = null;
    if (a.email) {
      const existing = await tx.query.user.findFirst({ where: eq(schema.user.email, a.email) });
      if (existing) {
        userId = existing.id;
      } else {
        userId = crypto.randomUUID();
        await tx.insert(schema.user).values({ id: userId, name: `${a.firstNames} ${a.lastName}`, email: a.email });
        // Mot de passe aléatoire : le membre choisit le sien via le lien reçu par e-mail.
        await tx.insert(schema.account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: await hashPassword(crypto.randomUUID() + crypto.randomUUID()),
        });
      }
    }
    const [m] = await tx
      .insert(schema.members)
      .values({
        number,
        userId,
        lastName: a.lastName,
        firstNames: a.firstNames,
        birthDate: a.birthDate,
        phone: a.phone,
        email: a.email,
        address: a.address,
        profession: a.profession,
        skills: a.skills ? a.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15) : [],
        category: a.category,
        parentId,
        sponsorId: a.sponsorId,
      })
      .returning();
    const period = periodOf(new Date());
    await tx.insert(schema.dues).values([
      { memberId: m!.id, kind: "DROIT_ENTREE", period, amount: entryFee(a.category) },
      { memberId: m!.id, kind: "COTISATION", period, amount: monthlyFee(a.category) },
    ]);
    await tx.update(schema.applications).set({ status: "MEMBRE", memberId: m!.id }).where(eq(schema.applications.id, a.id));
    await tx.insert(schema.auditLogs).values({ actorId, action: "membre.creation", target: m!.id, details: { application: a.reference, number } });
    return m!;
  });

  if (member.email) {
    await auth.api
      .requestPasswordReset({ body: { email: member.email, redirectTo: `${env.appUrl}/nouveau-mot-de-passe` } })
      .catch((e) => console.error("Invitation non envoyée", e));
  }
  return member;
}

export const documentLabel = (kind: DocumentKind) => DOCUMENT_KINDS[kind];
