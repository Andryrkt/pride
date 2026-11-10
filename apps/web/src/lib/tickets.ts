import "server-only";
import sharp from "sharp";
import { and, db, eq, inArray, schema } from "@pride/db";
import { TICKET_KINDS } from "@pride/shared";
import { responsableEmails } from "./commissions";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";

/**
 * Tickets « Signaler un problème » : tout compte connecté signale un bug ou propose une amélioration,
 * l'administrateur seul les traite (en cours, résolu, refusé) et l'auteur est prévenu par e-mail.
 */
type Member = typeof schema.members.$inferSelect;
export class TicketError extends Error {}

export const TICKET_STATUS = {
  NOUVEAU: ["Nouveau", "yellow"],
  EN_COURS: ["En cours", "dark"],
  RESOLU: ["Résolu", "green"],
  REFUSE: ["Refusé", "gray"],
} as const;
export type TicketStatus = keyof typeof TICKET_STATUS;
export const ticketRef = (n: number) => `T-${String(n).padStart(4, "0")}`;

const mail = (to: string[], subject: string, text: string) =>
  sendMail({ to: [...new Set(to)].join(", "), subject, text }).catch((e) => console.error("E-mail non envoyé :", subject, e));
const adminEmails = async () => {
  const admins = await responsableEmails(null, ["ADMIN_TECHNIQUE"]);
  return admins.length ? admins : [env.mailAssociation];
};

/** Capture d'écran : réencodée par sharp (refuse ce qui n'est pas une image, retire les métadonnées), 1600 px au plus. */
async function screenshot(file: File) {
  try {
    return await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    throw new TicketError("La capture d'écran n'est pas une image lisible (JPG, PNG ou WEBP).");
  }
}

export async function createTicket(member: Member, input: { kind: "BUG" | "AMELIORATION"; title: string; description: string; page: string }, userAgent: string | null, file?: File) {
  const image = file ? await screenshot(file) : null;
  const [t] = await db.insert(schema.tickets).values({ memberId: member.id, ...input, page: input.page || null, userAgent }).returning();
  if (image) {
    const key = `tickets/${t!.id}/capture-${crypto.randomUUID().slice(0, 8)}.jpg`;
    await putFile(key, image, "image/jpeg");
    await db.update(schema.tickets).set({ screenshotKey: key }).where(eq(schema.tickets.id, t!.id));
  }
  await mail(
    await adminEmails(),
    `[Ticket ${ticketRef(t!.number)}] ${input.kind === "BUG" ? "Bug" : "Amélioration"} : ${input.title}`,
    `${TICKET_KINDS[input.kind]}\nDe : ${member.firstNames} ${member.lastName} (${member.number})\nPage : ${input.page || "non indiquée"}\nNavigateur : ${userAgent ?? "inconnu"}${image ? "\nCapture d'écran jointe au ticket." : ""}\n\n${input.title}\n\n${input.description}\n\nÀ traiter : ${env.appUrl}/dirigeants/tickets`,
  );
  return t!;
}

/** Changement d'état par l'administrateur ; un message est obligatoire pour un refus. L'auteur reçoit un e-mail. */
export async function updateTicket(id: string, status: Exclude<TicketStatus, "NOUVEAU">, note: string, actorId: string) {
  if (status === "REFUSE" && !note) throw new TicketError("Expliquez le refus : le message est envoyé à l'auteur.");
  const allowedFrom: TicketStatus[] = status === "EN_COURS" ? ["NOUVEAU"] : ["NOUVEAU", "EN_COURS"];
  const [t] = await db
    .update(schema.tickets)
    .set({ status, adminNote: note || null, handledBy: actorId, handledAt: new Date() })
    .where(and(eq(schema.tickets.id, id), inArray(schema.tickets.status, allowedFrom)))
    .returning();
  if (!t) throw new TicketError("Ce ticket a déjà changé d'état : rechargez la page.");
  const author = await db.query.members.findFirst({ where: eq(schema.members.id, t.memberId) });
  if (author?.email) {
    const what = { EN_COURS: "est pris en charge", RESOLU: "est résolu", REFUSE: "n'est pas retenu" }[status];
    await mail(
      [author.email],
      `PRIDe : votre signalement ${ticketRef(t.number)} ${what}`,
      `Bonjour ${author.firstNames},\n\nVotre signalement « ${t.title} » ${what}.${note ? `\n\n${note}` : ""}\n\nMerci de nous aider à améliorer le site !\n\nSuivi : ${env.appUrl}/membre/signaler\n\nL'équipe PRIDe`,
    );
  }
  return t;
}

/** Texte prêt à coller dans un ticket GitHub du dépôt. */
export function githubText(t: typeof schema.tickets.$inferSelect) {
  return [
    `**${t.kind === "BUG" ? "Bug" : "Amélioration"}** signalé(e) dans l'application (${ticketRef(t.number)})`,
    "",
    t.description,
    "",
    `- Page : ${t.page ?? "non indiquée"}`,
    `- Navigateur : ${t.userAgent ?? "inconnu"}`,
    `- Date : ${t.createdAt.toISOString().slice(0, 10)}`,
    t.screenshotKey ? "- Capture d'écran : voir le ticket dans l'espace dirigeants" : "",
  ].filter((l, i, a) => l || a[i - 1]).join("\n").trim();
}
