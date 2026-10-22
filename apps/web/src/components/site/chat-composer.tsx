"use client";
import { useActionState, useState } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";
import { useFormStatus } from "react-dom";
import { initialFormState, type FormState } from "@/lib/utils";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label="Envoyer" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-800 disabled:opacity-60">
      <SendHorizontal size={20} aria-hidden />
    </button>
  );
}

/** Zone de saisie : message, pièce jointe facultative (PDF ou image, 5 Mo), envoi avec Entrée. */
export function ChatComposer({ action }: { action: (prev: FormState, data: FormData) => Promise<FormState> }) {
  const [state, send] = useActionState(action, initialFormState);
  const [file, setFile] = useState<string | null>(null);
  return (
    <form action={send} onSubmit={() => setFile(null)} className="flex flex-col gap-1.5 border-t border-line bg-white p-3">
      {state.message && !state.ok && <p role="alert" className="text-[13.5px] font-semibold text-flame-800">{state.message}</p>}
      {file && (
        <span className="flex items-center gap-1.5 self-start rounded-full bg-paper px-3 py-1 text-sm">
          <Paperclip size={14} aria-hidden /> {file}
        </span>
      )}
      <div className="flex items-center gap-2">
        <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-paper" title="Joindre un fichier">
          <Paperclip size={20} aria-hidden />
          <span className="sr-only">Joindre un fichier (PDF ou image, 5 Mo maximum)</span>
          <input
            type="file"
            name="attachment"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="absolute size-px opacity-0"
            onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <input name="body" type="text" autoComplete="off" maxLength={4000} placeholder="Écrivez votre message…" aria-label="Votre message" className="min-h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-[#c3ccc5] bg-white px-4 text-[15px] focus:border-brand-600 focus:outline-none" />
        <Send />
      </div>
    </form>
  );
}
