import Link from "next/link";
import { asc, db, desc, eq, ne, schema } from "@pride/db";
import { MESSAGE_RECIPIENTS } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ChatThread, messageTime } from "@/components/site/chat";
import { ChatComposer } from "@/components/site/chat-composer";
import { Badge } from "@/components/ui/card";
import { unreadForStaff } from "@/lib/messaging";
import { requireDirigeant } from "@/lib/session";
import { cn } from "@/lib/utils";
import { staffReplyAction } from "../actions";

export default async function StaffMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireDirigeant();
  const { c } = await searchParams;
  // Les échanges avec l'assistant restent privés : seules les conversations transmises à un responsable sont visibles.
  const convs = await db.query.conversations.findMany({
    where: ne(schema.conversations.recipient, "ASSISTANT"),
    orderBy: desc(schema.conversations.lastMessageAt),
    with: { member: true, messages: { orderBy: desc(schema.messages.createdAt), limit: 1 } },
  });
  const conv = convs.find((x) => x.id === c) ?? convs[0];
  const messages = conv
    ? await db.query.messages.findMany({ where: eq(schema.messages.conversationId, conv.id), orderBy: asc(schema.messages.createdAt), with: { author: true } })
    : [];
  if (conv && unreadForStaff(conv)) await db.update(schema.conversations).set({ staffReadAt: new Date() }).where(eq(schema.conversations.id, conv.id));

  return (
    <>
      <PageTitle title="Messagerie" sub="Questions des membres transmises par l'assistant au Trésorier, au Secrétariat général, au Coordonnateur ou à la Commission sociale. Le membre reçoit votre réponse ici et par e-mail." />
      {convs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-muted">Aucune conversation pour le moment.</p>
      ) : (
        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-white lg:h-[640px] lg:flex-row">
          <nav aria-label="Conversations" className="flex max-h-80 w-full flex-col gap-1 overflow-y-auto border-b border-line bg-paper p-2 lg:max-h-none lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0">
            {convs.map((x) => (
              <Link
                key={x.id}
                href={`/dirigeants/messages?c=${x.id}`}
                aria-current={x.id === conv?.id ? "page" : undefined}
                className={cn("flex flex-col gap-0.5 rounded-xl p-2.5", x.id === conv?.id ? "bg-white shadow-sm" : "hover:bg-white/70")}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-[15px]">{x.member.firstNames} {x.member.lastName}</strong>
                  {x.id !== conv?.id && unreadForStaff(x) && <span className="rounded-full bg-flame-600 px-1.5 text-xs font-bold text-white">Nouveau</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="gray">{MESSAGE_RECIPIENTS[x.recipient]}</Badge>
                  <span className="truncate text-[13px] text-muted">{x.messages[0]?.body ?? ""}</span>
                </span>
              </Link>
            ))}
          </nav>
          {conv && (
            <section aria-label="Conversation" className="flex min-h-[480px] min-w-0 flex-1 flex-col bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-3">
                <div>
                  <strong>{conv.member.firstNames} {conv.member.lastName}</strong>
                  <div className="text-[13px] text-muted">
                    {conv.member.number}{conv.member.phone ? ` · ${conv.member.phone}` : ""}{conv.member.email ? ` · ${conv.member.email}` : ""}
                  </div>
                </div>
                <Badge>À l'attention de : {MESSAGE_RECIPIENTS[conv.recipient]}</Badge>
              </div>
              <ChatThread
                messages={messages.map((m) => ({
                  id: m.id,
                  mine: m.sender === "EQUIPE",
                  who: `${conv.member.firstNames} ${conv.member.lastName}`,
                  body: m.sender === "EQUIPE" && m.author ? `${m.body}\n— ${m.author.firstNames} ${m.author.lastName}` : m.body,
                  time: messageTime(m.createdAt),
                  attachmentName: m.attachmentName,
                }))}
              />
              <ChatComposer action={staffReplyAction.bind(null, conv.id)} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
