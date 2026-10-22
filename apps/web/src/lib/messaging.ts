import "server-only";
import { and, asc, db, desc, eq, gte, inArray, schema } from "@pride/db";
import { AIDE_SOLIDARITE, assistantIntent, formatAriary, MESSAGE_RECIPIENTS, type MandateRole, type MessageRecipient } from "@pride/shared";
import { validateFile } from "./applications";
import { responsableEmails } from "./commissions";
import { ensureDues, listDues } from "./dues";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";
import { formatDateTime } from "./utils";

type Member = typeof schema.members.$inferSelect;
type Reply = { body: string; links?: { label: string; href: string }[]; chips?: "MENU" | "TRANSFERT" };
export class MessagingError extends Error {}

/** Boutons de réponse rapide proposés par l'assistant. */
export const MENU_CHIPS = ["Ma cotisation", "Prochaines formations", "Aide de solidarité", "Assemblée générale", "Parler à un responsable"];
export const HUMAN_RECIPIENTS = ["TRESORIER", "SECRETARIAT", "COORDONNATEUR", "COMMISSION_SOCIALE"] as const satisfies MessageRecipient[];

/** Qui est prévenu par e-mail pour chaque destinataire (en plus de la boîte de l'association). */
const ROUTING: Record<Exclude<MessageRecipient, "ASSISTANT">, [string | null, MandateRole[]]> = {
  TRESORIER: [null, ["TRESORIER"]],
  SECRETARIAT: [null, ["SECRETAIRE_GENERALE"]],
  COORDONNATEUR: [null, ["COORDONNATEUR"]],
  COMMISSION_SOCIALE: ["sociale", []],
};

const mail = (to: string[], subject: string, text: string) =>
  sendMail({ to: [...new Set(to)].join(", "), subject, text }).catch((e) => console.error("E-mail non envoyé :", subject, e));

export async function conversationOf(memberId: string, recipient: MessageRecipient) {
  await db.insert(schema.conversations).values({ memberId, recipient }).onConflictDoNothing();
  return (await db.query.conversations.findFirst({ where: and(eq(schema.conversations.memberId, memberId), eq(schema.conversations.recipient, recipient)) }))!;
}

async function addMessage(conversationId: string, m: { sender: "MEMBRE" | "ASSISTANT" | "EQUIPE"; authorId?: string; body: string } & Omit<Reply, "body">, file?: File) {
  const [msg] = await db
    .insert(schema.messages)
    .values({ conversationId, sender: m.sender, authorId: m.authorId, body: m.body, links: m.links, chips: m.chips })
    .returning();
  if (file) {
    const ext = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? "bin";
    const key = `messages/${conversationId}/${msg!.id}.${ext}`;
    try {
      await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    } catch (e) {
      // Sans sa pièce jointe, le message est retiré : la personne le renvoie complet.
      console.error("Pièce jointe non enregistrée", e);
      await db.delete(schema.messages).where(eq(schema.messages.id, msg!.id));
      throw new MessagingError("La pièce jointe n'a pas pu être enregistrée. Merci de réessayer.");
    }
    await db.update(schema.messages).set({ attachmentKey: key, attachmentName: file.name, attachmentType: file.type }).where(eq(schema.messages.id, msg!.id));
  }
  const now = new Date();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: now, lastSender: m.sender, ...(m.sender === "EQUIPE" ? { staffReadAt: now } : { memberReadAt: now }) })
    .where(eq(schema.conversations.id, conversationId));
  return msg!;
}

/** Premier contact : l'assistant se présente. */
export async function ensureAssistant(member: Member) {
  const conv = await conversationOf(member.id, "ASSISTANT");
  const first = await db.query.messages.findFirst({ where: eq(schema.messages.conversationId, conv.id) });
  if (!first) {
    await addMessage(conv.id, {
      sender: "ASSISTANT",
      body: `Bonjour ${member.firstNames.split(" ")[0]} ! Je suis l'assistant PRIDe. Je peux vous renseigner sur vos cotisations, les formations, la solidarité ou l'assemblée générale, ou transmettre votre question à un responsable.`,
      chips: "MENU",
    });
  }
  return conv;
}

/** Réponse de l'assistant, à partir des données réelles du membre. */
async function assistantReply(member: Member, question: string): Promise<Reply> {
  switch (assistantIntent(question)) {
    case "COTISATION": {
      await ensureDues(member);
      const unpaid = (await listDues(member.id)).filter((d) => d.status === "A_PAYER");
      const total = unpaid.reduce((s, d) => s + d.amount, 0);
      return {
        body: unpaid.length
          ? `Il vous reste ${formatAriary(total)} à payer (${unpaid.length} échéance${unpaid.length > 1 ? "s" : ""}). Vous pouvez payer par MVola, Orange Money ou Airtel Money ; le reçu est disponible tout de suite dans « Mes cotisations ».`
          : "Vos cotisations sont à jour. Merci ! L'historique et les reçus sont dans « Mes cotisations ».",
        links: [{ label: unpaid.length ? "Payer ma cotisation" : "Mes cotisations", href: "/membre/cotisations" }],
      };
    }
    case "FORMATION": {
      const next = await db.query.posts.findFirst({ where: and(eq(schema.posts.type, "FORMATION"), gte(schema.posts.eventAt, new Date())), orderBy: asc(schema.posts.eventAt) });
      return {
        body: next ? `Prochaine formation : « ${next.title} », le ${formatDateTime(next.eventAt)}${next.location ? `, ${next.location}` : ""}.` : "Aucune formation n'est programmée pour le moment. Vous pouvez proposer d'animer un atelier.",
        links: [{ label: "Voir les formations", href: "/membre/formations" }],
      };
    }
    case "SOLIDARITE":
      return {
        body: `Lors d'un événement heureux ou douloureux, l'association verse ${formatAriary(AIDE_SOLIDARITE.membre)} au membre et ${formatAriary(AIDE_SOLIDARITE.famille)} à sa famille proche (règlement intérieur, art. 6). En cas de décès, deux représentants assistent à l'enterrement, aux frais de l'association.`,
        links: [{ label: "Déclarer un événement", href: "/membre#solidarite" }],
      };
    case "AG": {
      const ag = await db.query.assemblies.findFirst({ where: inArray(schema.assemblies.status, ["CONVOQUEE", "EN_SEANCE"]), orderBy: asc(schema.assemblies.scheduledAt) });
      return {
        body: ag ? `Prochaine assemblée générale : le ${formatDateTime(ag.scheduledAt)}, ${ag.location}. La convocation et l'ordre du jour sont dans votre espace.` : "Aucune assemblée générale n'est convoquée pour le moment. Vous recevrez la convocation par e-mail au moins 15 jours avant.",
        links: [{ label: "Assemblée générale", href: "/membre/ag" }],
      };
    }
    case "CARTE":
      return { body: `Votre carte de membre (N° ${member.number}) se télécharge depuis votre tableau de bord, une fois votre photo ajoutée dans « Mon profil ».`, links: [{ label: "Ma carte de membre", href: "/membre" }] };
    case "RESPONSABLE":
      return { body: "À qui voulez-vous que je transmette votre conversation ?", chips: "TRANSFERT" };
    case "MERCI":
      return { body: "Avec plaisir ! Autre chose ?", chips: "MENU" };
    default:
      return { body: "Je n'ai pas bien compris. Voici ce que je peux faire :", chips: "MENU" };
  }
}

async function notifyStaff(member: Member, recipient: Exclude<MessageRecipient, "ASSISTANT">, conversationId: string, body: string) {
  const [slug, roles] = ROUTING[recipient];
  await mail(
    [env.mailAssociation, ...(await responsableEmails(slug, roles))],
    `[Messagerie] ${member.firstNames} ${member.lastName} → ${MESSAGE_RECIPIENTS[recipient]}`,
    `${member.firstNames} ${member.lastName} (${member.number}) a écrit à « ${MESSAGE_RECIPIENTS[recipient]} » :\n\n${body}\n\nRépondre dans l'espace dirigeants : ${env.appUrl}/dirigeants/messages?c=${conversationId}`,
  );
}

/** Message d'un membre ; l'assistant répond tout de suite, sinon l'équipe est prévenue par e-mail. */
export async function postMemberMessage(member: Member, recipient: MessageRecipient, body: string, file?: File) {
  if (file) {
    const problem = validateFile(file);
    if (problem) throw new MessagingError(problem);
  }
  const conv = recipient === "ASSISTANT" ? await ensureAssistant(member) : await conversationOf(member.id, recipient);
  await addMessage(conv.id, { sender: "MEMBRE", authorId: member.id, body }, file);
  if (recipient === "ASSISTANT") await addMessage(conv.id, { sender: "ASSISTANT", ...(await assistantReply(member, body)) });
  else await notifyStaff(member, recipient, conv.id, file ? `${body}\n\n(pièce jointe : ${file.name})` : body);
}

/** « Parler à un responsable » : la dernière question posée à l'assistant ouvre la conversation avec le responsable choisi. */
export async function handOff(member: Member, recipient: Exclude<MessageRecipient, "ASSISTANT">) {
  const bot = await ensureAssistant(member);
  const questions = await db.query.messages.findMany({ where: and(eq(schema.messages.conversationId, bot.id), eq(schema.messages.sender, "MEMBRE")), orderBy: desc(schema.messages.createdAt), limit: 5 });
  // La vraie question, pas les boutons « Parler à un responsable »
  const question = questions.find((q) => assistantIntent(q.body) !== "RESPONSABLE")?.body;
  const target = await conversationOf(member.id, recipient);
  const body = question ? `Question transmise par l'assistant : « ${question} »` : "Bonjour, je souhaite vous parler.";
  await addMessage(target.id, { sender: "MEMBRE", authorId: member.id, body });
  await addMessage(bot.id, { sender: "ASSISTANT", body: `C'est noté : votre conversation est transmise à « ${MESSAGE_RECIPIENTS[recipient]} ». La réponse arrivera dans cette conversation et par e-mail.`, links: [{ label: `Ouvrir la conversation`, href: `/membre/messages?c=${recipient}` }] });
  await notifyStaff(member, recipient, target.id, body);
}

/** Réponse d'un dirigeant au nom du destinataire ; le membre est prévenu par e-mail. */
export async function staffReply(actor: Member, conversationId: string, body: string, file?: File) {
  const conv = await db.query.conversations.findFirst({ where: eq(schema.conversations.id, conversationId), with: { member: true } });
  if (!conv || conv.recipient === "ASSISTANT") throw new MessagingError("Conversation introuvable.");
  if (file) {
    const problem = validateFile(file);
    if (problem) throw new MessagingError(problem);
  }
  await addMessage(conv.id, { sender: "EQUIPE", authorId: actor.id, body }, file);
  if (conv.member.email) {
    await mail(
      [conv.member.email],
      `PRIDe : réponse de « ${MESSAGE_RECIPIENTS[conv.recipient]} »`,
      `Bonjour ${conv.member.firstNames},\n\n« ${MESSAGE_RECIPIENTS[conv.recipient]} » vous a répondu :\n\n${body}\n\nVoir la conversation : ${env.appUrl}/membre/messages?c=${conv.recipient}`,
    );
  }
  return conv;
}

/** Non lu : le dernier message vient de l'autre côté et n'a pas encore été vu. */
export const unreadForMember = (c: { lastSender: string; lastMessageAt: Date; memberReadAt: Date | null }) => c.lastSender === "EQUIPE" && (!c.memberReadAt || c.memberReadAt < c.lastMessageAt);
export const unreadForStaff = (c: { lastSender: string; lastMessageAt: Date; staffReadAt: Date | null; recipient: string }) =>
  c.recipient !== "ASSISTANT" && c.lastSender === "MEMBRE" && (!c.staffReadAt || c.staffReadAt < c.lastMessageAt);
