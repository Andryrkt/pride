"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { registerToEvent } from "./actions";

/** Bouton « Je participe », qui ouvre un petit formulaire (nom et téléphone) sous l'événement. */
export function EventRegistration({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(registerToEvent.bind(null, postId), initialFormState);
  const d = state.data ?? {};
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <p role="status" className="basis-full rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">
        ✓ {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} aria-expanded={false}>
        Je participe
      </Button>
    );
  }
  return (
    <form action={action} className="flex basis-full flex-wrap items-start gap-3.5 rounded-2xl bg-[#f0f8f3] p-5" noValidate>
      {state.message && <div className="basis-full"><FormMessage state={state} /></div>}
      <Input label="Nom et prénom" name="name" id={`name-${postId}`} required placeholder="RAKOTO Hery" defaultValue={d.name} error={e.name} className="flex-[1_1_220px]" autoComplete="name" />
      <Input label="Téléphone" name="phone" id={`phone-${postId}`} type="tel" required placeholder="034 12 345 67" defaultValue={d.phone} error={e.phone} className="flex-[1_1_200px]" autoComplete="tel" />
      <div className="flex flex-wrap gap-2 self-end">
        <SubmitButton pendingLabel="Inscription…">Confirmer ma participation</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
      <p className="basis-full text-[13px] text-muted">
        <span className="text-flame-600">*</span> champ obligatoire · Votre numéro sert uniquement à vous joindre pour cet événement.
      </p>
    </form>
  );
}
