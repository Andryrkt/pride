"use client";
import { useActionState } from "react";
import { TICKET_KINDS } from "@pride/shared";
import { FormMessage, Input, RequiredLegend, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { createTicketAction } from "../actions";

/** Formulaire « Signaler un problème » ; `page` : page d'où vient la personne (notée automatiquement). */
export function TicketForm({ page }: { page: string }) {
  const [state, action] = useActionState(createTicketAction, initialFormState);
  const e = state.errors ?? {};
  const d = (state.ok ? {} : state.data ?? {}) as Record<string, string>;
  return (
    <form action={action} key={state.ok ? state.message : "form"} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <RequiredLegend />
      <input type="hidden" name="page" value={d.page ?? page} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-[#2b3832]">Type <span className="text-flame-600">*</span></legend>
        {Object.entries(TICKET_KINDS).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2.5 text-[15px]">
            <input type="radio" name="kind" value={k} required defaultChecked={(d.kind ?? "BUG") === k} className="size-5 accent-brand-600" />
            {label}
          </label>
        ))}
        {e.kind && <p className="text-[13.5px] font-semibold text-flame-800">{e.kind}</p>}
      </fieldset>
      <Input label="Titre" name="title" required defaultValue={d.title} error={e.title} hint="En quelques mots. Ex. : le bouton « Payer » ne répond pas." />
      <Textarea
        label="Description"
        name="description"
        required
        rows={5}
        defaultValue={d.description}
        error={e.description}
        hint="Pour un bug : ce que vous avez fait, ce qui s'est passé, ce que vous attendiez. Pour une idée : ce qui vous aiderait et pourquoi."
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="screenshot" className="text-sm font-semibold text-[#2b3832]">Capture d&apos;écran (facultatif)</label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={!!e.screenshot}
          aria-describedby="screenshot-hint"
          className="rounded-xl border-[1.5px] border-dashed border-[#9daaa1] bg-[#fafbf9] p-3 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-800"
        />
        <p id="screenshot-hint" className="text-[13px] text-muted">JPG, PNG ou WEBP, 5 Mo maximum. Évitez d&apos;y montrer un mot de passe.</p>
        {e.screenshot && <p className="text-[13.5px] font-semibold text-flame-800">{e.screenshot}</p>}
      </div>
      <p className="text-[13px] text-muted">
        Sont joints automatiquement : la page {d.page || page ? <>(<code>{d.page || page}</code>)</> : ""} et le type de navigateur, pour aider à comprendre le problème.
      </p>
      <SubmitButton className="self-start" pendingLabel="Envoi…">Envoyer le signalement</SubmitButton>
    </form>
  );
}
