"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { voteConsultationAction } from "../actions";

/** Bulletin : une seule réponse, validée une seule fois. */
export function ConsultationVote({ id, options }: { id: string; options: string[] }) {
  const [state, action] = useActionState(voteConsultationAction.bind(null, id), initialFormState);
  const [pick, setPick] = useState<number | null>(null);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">Votre réponse</legend>
        {options.map((o, i) => (
          <label key={o} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-2.5", pick === i ? "border-brand-600 bg-[#f0f8f3]" : "border-line bg-white hover:border-brand-600")}>
            <input type="radio" name="option" value={i} checked={pick === i} onChange={() => setPick(i)} className="size-4.5 accent-brand-600" />
            {o}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton pendingLabel="Envoi…">Valider mon vote</SubmitButton>
        <span className="text-[13.5px] text-muted">{pick === null ? "Choisissez une réponse" : "Un seul vote par membre, il ne pourra pas être modifié"}</span>
      </div>
    </form>
  );
}
