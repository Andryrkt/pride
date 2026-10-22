import Link from "next/link";
import { asc, db, desc, eq, schema } from "@pride/db";
import { MESSAGE_RECIPIENTS, type MessageRecipient } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ChatThread, messageTime } from "@/components/site/chat";
import { ChatComposer } from "@/components/site/chat-composer";
import { ensureAssistant, HUMAN_RECIPIENTS, MENU_CHIPS, unreadForMember } from "@/lib/messaging";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { handOffAction, quickReplyAction, sendMessageAction } from "../actions";

const COLORS: Record<MessageRecipient, string> = { ASSISTANT: "bg-brand-600", TRESORIER: "bg-flame-600", SECRETARIAT: "bg-brand-800", COORDONNATEUR: "bg-[#3d4842]", COMMISSION_SOCIALE: "bg-[#3e9a6c]" };
const STATUS: Record<MessageRecipient, string> = { ASSISTANT: "Répond immédiatement", TRESORIER: "Répond en général sous 48 h", SECRETARIAT: "Répond en général sous 48 h", COORDONNATEUR: "Répond en général sous 48 h", COMMISSION_SOCIALE: "Répond en général sous 48 h" };
const initials = (label: string) => label.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { member } = await requireMember();
  await ensureAssistant(member);
  const requested = (await searchParams).c;
  const current: MessageRecipient = requested && requested in MESSAGE_RECIPIENTS ? (requested as MessageRecipient) : "ASSISTANT";

  const convs = await db.query.conversations.findMany({
    where: eq(schema.conversations.memberId, member.id),
    orderBy: desc(schema.conversations.lastMessageAt),
    with: { messages: { orderBy: desc(schema.messages.createdAt), limit: 1 } },
  });
  // L'assistant toujours en premier, puis les conversations avec les responsables
  const list = [...convs.filter((c) => c.recipient === "ASSISTANT"), ...convs.filter((c) => c.recipient !== "ASSISTANT")];
  const conv = convs.find((c) => c.recipient === current);
  const messages = conv
    ? await db.query.messages.findMany({ where: eq(schema.messages.conversationId, conv.id), orderBy: asc(schema.messages.createdAt) })
    : [];
  if (conv && unreadForMember(conv)) await db.update(schema.conversations).set({ memberReadAt: new Date() }).where(eq(schema.conversations.id, conv.id));
  const last = messages.at(-1);

  return (
    <>
      <PageTitle title="Messagerie" sub="Posez votre question à l'assistant PRIDe : il répond tout de suite ou transmet à la bonne personne." />
      <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-white lg:h-[640px] lg:flex-row">
        <nav aria-label="Conversations" className="flex w-full flex-col gap-1 border-b border-line bg-paper p-2 lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0">
          {list.map((c) => {
            const label = MESSAGE_RECIPIENTS[c.recipient];
            const unread = c.recipient !== current && unreadForMember(c);
            return (
              <Link
                key={c.id}
                href={c.recipient === "ASSISTANT" ? "/membre/messages" : `/membre/messages?c=${c.recipient}`}
                aria-current={c.recipient === current ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-xl p-2.5", c.recipient === current ? "bg-white shadow-sm" : "hover:bg-white/70")}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", COLORS[c.recipient])} aria-hidden>{initials(label)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="text-[15px]">{label}</strong>
                  <span className="truncate text-[13px] text-muted">{c.messages[0]?.body ?? ""}</span>
                </span>
                {unread && <span className="rounded-full bg-flame-600 px-1.5 text-xs font-bold text-white">Nouveau</span>}
              </Link>
            );
          })}
        </nav>
        <section aria-label="Conversation" className="flex min-h-[480px] min-w-0 flex-1 flex-col bg-paper">
          <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", COLORS[current])} aria-hidden>{initials(MESSAGE_RECIPIENTS[current])}</span>
            <div>
              <strong>{MESSAGE_RECIPIENTS[current]}</strong>
              <div className="text-[13px] text-muted">{STATUS[current]}</div>
            </div>
          </div>
          <ChatThread
            messages={messages.map((m) => ({
              id: m.id,
              mine: m.sender === "MEMBRE",
              who: m.sender === "ASSISTANT" ? "Assistant PRIDe" : MESSAGE_RECIPIENTS[current],
              body: m.body,
              time: messageTime(m.createdAt),
              links: m.links,
              attachmentName: m.attachmentName,
            }))}
            after={
              // Les boutons restent sous chaque réponse de l'assistant : le membre n'est jamais bloqué.
              last?.sender === "ASSISTANT" && last.chips !== "TRANSFERT"
                ? MENU_CHIPS.map((q) => (
                    <form key={q} action={quickReplyAction.bind(null, q)}>
                      <button className="min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-brand-800 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-50">{q}</button>
                    </form>
                  ))
                : last?.sender === "ASSISTANT" && last.chips === "TRANSFERT"
                  ? HUMAN_RECIPIENTS.map((r) => (
                      <form key={r} action={handOffAction.bind(null, r)}>
                        <button className="min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-brand-800 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-50">{MESSAGE_RECIPIENTS[r]}</button>
                      </form>
                    ))
                  : null
            }
          />
          <ChatComposer action={sendMessageAction.bind(null, current)} />
        </section>
      </div>
      {current === "ASSISTANT" && (
        <p className="text-sm text-muted">
          Pour écrire directement à un responsable, cliquez sur « Parler à un responsable ». Les réponses arrivent ici et par e-mail.
        </p>
      )}
    </>
  );
}
