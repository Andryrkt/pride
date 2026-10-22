import Link from "next/link";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  mine: boolean;
  who: string;
  body: string;
  time: string;
  links?: { label: string; href: string }[] | null;
  attachmentName?: string | null;
};

/** Fil de discussion ; `after` (boutons de réponse rapide) s'affiche sous le dernier message. Le plus récent est en bas. */
export function ChatThread({ messages, after }: { messages: ChatMessage[]; after?: React.ReactNode }) {
  return (
    // column-reverse : la vue s'ouvre directement sur les derniers messages, sans script.
    <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
      {after && <div className="flex flex-wrap gap-2">{after}</div>}
      {[...messages].reverse().map((m) => (
        <div key={m.id} className={cn("flex max-w-[85%] flex-col gap-1", m.mine ? "items-end self-end" : "items-start self-start")}>
          {!m.mine && <span className="text-xs font-semibold text-muted">{m.who}</span>}
          <div className={cn("rounded-2xl px-4 py-2.5 text-[15px] whitespace-pre-line", m.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-line")}>
            {m.body}
            {m.attachmentName && (
              <a href={`/api/messages/${m.id}`} target="_blank" className={cn("mt-1.5 flex items-center gap-1.5 text-sm font-semibold underline", m.mine ? "text-white" : "text-brand-600")}>
                <Paperclip size={15} aria-hidden /> {m.attachmentName}
              </a>
            )}
          </div>
          {m.links && m.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {m.links.map((l) => (
                <Link key={l.href} href={l.href} className="inline-flex min-h-9 items-center rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-800 hover:bg-brand-100">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
          <span className="text-xs text-muted">{m.time}</span>
        </div>
      ))}
    </div>
  );
}

const dayTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const messageTime = (d: Date) => dayTime.format(d);
