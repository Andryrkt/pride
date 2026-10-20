"use client";
import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Paperclip, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { sendContact } from "./actions";

const line = "w-full min-h-11 border-0 bg-transparent py-2 text-[15px] outline-none placeholder:text-[#6b776f]";

/** « Nouveau message » remonte le formulaire pour repartir d'un état vide. */
export function ContactForm() {
  const [n, setN] = useState(0);
  return <ContactMessage key={n} onNew={() => setN(n + 1)} />;
}

function ContactMessage({ onNew }: { onNew: () => void }) {
  const [state, action] = useActionState(sendContact, initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const d = state.data ?? {};
  const e = state.errors ?? {};

  function syncInput(next: File[]) {
    setFiles(next);
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (fileInput.current) fileInput.current.files = dt.files;
  }

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-lg">
        <CheckCircle2 size={56} className="text-brand-600" aria-hidden />
        <h2 className="text-3xl font-extrabold">Message envoyé</h2>
        <div className="flex flex-col gap-1.5 rounded-xl bg-paper px-4 py-3.5 text-[15px]">
          <span><span className="text-muted">À : </span>PRIDe &lt;association4pride@gmail.com&gt;</span>
          <span><span className="text-muted">Objet : </span>{state.message}</span>
          <span><span className="text-muted">Pièces jointes : </span>{d.attachments ?? "0"}</span>
        </div>
        <p>Votre message a été transmis par e-mail à l'association PRIDe. Nous vous répondons en général sous 48 heures.</p>
        <Button type="button" variant="outline" className="self-start" onClick={onNew}>Nouveau message</Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(11,42,29,.12)]">
        <div className="bg-[#eef2ee] px-5 py-3 text-[14.5px] font-semibold">Nouveau message</div>
        <div className="flex min-h-12 items-center gap-3 border-b border-[#e6eae5] px-5">
          <span className="w-8 text-muted">À</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef2ee] py-1 pr-3 pl-1 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">P</span>
            PRIDe &lt;association4pride@gmail.com&gt;
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 border-b border-[#e6eae5] px-5">
          <span className="w-8 text-muted">De</span>
          <input name="name" aria-label="Votre nom" placeholder="Votre nom *" defaultValue={d.name} className={`${line} flex-[1_1_160px]`} required />
          <input name="email" type="email" aria-label="Votre e-mail" placeholder="votre.email@exemple.mg *" defaultValue={d.email} className={`${line} flex-[2_1_220px]`} required />
        </div>
        <div className="border-b border-[#e6eae5] px-5">
          <input name="subject" aria-label="Objet" placeholder="Objet *" defaultValue={d.subject} className={`${line} font-medium`} required />
        </div>
        <textarea name="message" aria-label="Message" placeholder="Écrivez votre message… *" defaultValue={d.message} className="min-h-64 w-full resize-y border-0 px-5 py-4 text-[15.5px] leading-relaxed outline-none" required />
        {files.length > 0 && (
          <div className="grid gap-2 px-5 pb-4 sm:grid-cols-2">
            {files.map((f, i) => (
              <div key={f.name + i} className="flex items-center gap-3 rounded-xl border border-line bg-[#f7f8f6] p-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-flame-600 text-[11px] font-extrabold text-white">{(f.name.split(".").pop() ?? "").slice(0, 3).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13.5px]">{f.name}</strong>
                  <span className="text-xs text-muted">{Math.max(1, Math.round(f.size / 1024))} Ko</span>
                </span>
                <button type="button" onClick={() => syncInput(files.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="flex size-9 items-center justify-center rounded-full hover:bg-line">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e6eae5] px-4 py-3">
          <SubmitButton pendingLabel="Envoi…">Envoyer</SubmitButton>
          <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#e6eae5]" title="Joindre des fichiers">
            <Paperclip size={20} aria-hidden />
            <span className="sr-only">Joindre des fichiers</span>
            <input
              ref={fileInput}
              type="file"
              name="attachments"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="absolute size-px opacity-0"
              onChange={(ev) => syncInput([...files, ...Array.from(ev.target.files ?? [])].slice(0, 3))}
            />
          </label>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" aria-label="Effacer le brouillon" onClick={() => { formRef.current?.reset(); syncInput([]); }}>
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
      {(e.name || e.email || e.subject || e.message || e.attachments) && (
        <ul className="list-inside list-disc text-[13.5px] font-semibold text-flame-800">
          {[e.name, e.email, e.subject, e.message, e.attachments].filter(Boolean).map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <p className="text-[13px] text-muted">* champ obligatoire · 3 pièces jointes maximum (PDF ou images, 5 Mo chacune). Vos coordonnées servent uniquement à vous répondre.</p>
    </form>
  );
}
