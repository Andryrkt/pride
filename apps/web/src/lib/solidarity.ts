import "server-only";
import { and, db, eq, schema } from "@pride/db";
import { formatAriary, solidarityAmount, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS, type SolidariteConcerne, type SolidariteEvenement } from "@pride/shared";
import { responsableEmails } from "./commissions";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";
import { formatDate } from "./utils";

type Member = typeof schema.members.$inferSelect;
export class SolidarityError extends Error {}

export const SOLIDARITY_STATUS = {
  DEMANDEE: ["En attente", "yellow"],
  ACCORDEE: ["Accordée, à verser", "green"],
  REFUSEE: ["Refusée", "red"],
} as const;

/** `file` : pièce jointe facultative, déjà validée (type et taille) par l'action. */
export async function declareSolidarity(member: Member, input: { kind: SolidariteEvenement; concerns: SolidariteConcerne; eventDate: Date; message?: string }, file?: File) {
  if (member.status !== "ACTIF") throw new SolidarityError("Seul un membre actif peut demander l'aide de solidarité.");
  const amount = solidarityAmount(input.concerns);
  const [row] = await db
    .insert(schema.solidarityRequests)
    .values({ memberId: member.id, ...input, message: input.message || null, amount })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new SolidarityError("Vous avez déjà déclaré cet événement à cette date.");

  let attachment: { filename: string; content: Buffer; contentType: string } | undefined;
  if (file) {
    attachment = { filename: file.name, content: Buffer.from(await file.arrayBuffer()), contentType: file.type };
    const ext = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? "bin";
    const key = `solidarite/${row.id}/piece-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    try {
      await putFile(key, attachment.content, file.type);
      await db.update(schema.solidarityRequests).set({ attachmentKey: key, attachmentName: file.name, attachmentType: file.type }).where(eq(schema.solidarityRequests.id, row.id));
    } catch (e) {
      // Sans sa pièce, la demande est retirée : le membre la renvoie complète.
      console.error("Pièce jointe de solidarité non enregistrée", e);
      await db.delete(schema.solidarityRequests).where(eq(schema.solidarityRequests.id, row.id));
      throw new SolidarityError("La pièce jointe n'a pas pu être enregistrée. Merci de réessayer.");
    }
  }

  const to = [...new Set([env.mailAssociation, ...(await responsableEmails("sociale", ["TRESORIER"]))])];
  await sendMail({
    to: to.join(", "),
    subject: `Aide de solidarité : ${SOLIDARITE_EVENEMENTS[input.kind].toLowerCase()} · ${member.lastName} ${member.firstNames}`,
    text: `Nouvelle déclaration d'un membre.\n\nMembre : ${member.lastName} ${member.firstNames} (${member.number})${member.phone ? `, ${member.phone}` : ""}\nÉvénement : ${SOLIDARITE_EVENEMENTS[input.kind]}, le ${formatDate(input.eventDate)}\nConcerne : ${SOLIDARITE_CONCERNE[input.concerns]}\nAide prévue : ${formatAriary(amount)}${input.message ? `\n\nMessage :\n${input.message}` : ""}${attachment ? `\n\nPièce jointe : ${attachment.filename}` : ""}\n\nÀ traiter dans l'espace dirigeants : ${env.appUrl}/dirigeants/solidarite`,
    attachments: attachment ? [attachment] : undefined,
  }).catch((e) => console.error("Déclaration de solidarité : e-mail non envoyé", e));
  return row;
}

/** Décision des dirigeants ; une demande déjà traitée ne change plus. */
export async function decideSolidarity(id: string, decision: "ACCORDEE" | "REFUSEE", note: string, actorId: string) {
  const [row] = await db
    .update(schema.solidarityRequests)
    .set({ status: decision, decisionNote: note || null, decidedAt: new Date(), decidedBy: actorId })
    .where(and(eq(schema.solidarityRequests.id, id), eq(schema.solidarityRequests.status, "DEMANDEE")))
    .returning();
  if (!row) throw new SolidarityError("Cette demande a déjà été traitée.");
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, row.memberId) });
  if (member?.email) {
    await sendMail({
      to: member.email,
      subject: decision === "ACCORDEE" ? "PRIDe : votre aide de solidarité est accordée" : "PRIDe : réponse à votre demande d'aide de solidarité",
      text: `Bonjour ${member.firstNames},\n\n${
        decision === "ACCORDEE"
          ? `L'aide de solidarité de ${formatAriary(row.amount)} vous est accordée. Le Trésorier vous contactera pour le versement.`
          : "Votre demande d'aide de solidarité n'a pas été retenue."
      }${note ? `\n\n${note}` : ""}\n\nL'équipe PRIDe`,
    }).catch((e) => console.error("Réponse de solidarité : e-mail non envoyé", e));
  }
  return row;
}
