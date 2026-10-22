"use client";
import { useActionState } from "react";
import { FormMessage, Input, RequiredLegend, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { createConsultationAction } from "./actions";

/** Ouverture d'une consultation ; en cas d'erreur, la saisie est conservée. */
export function ConsultationForm({ closing }: { closing: string }) {
  const [state, action] = useActionState(createConsultationAction, initialFormState);
  const d = state.ok ? {} : (state.data ?? {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <RequiredLegend />
      <FormMessage state={state} />
      <Input label="Question" name="question" required defaultValue={d.question} error={e.question} placeholder="Ex. : Quel thème de formation prioritaire pour 2027 ?" />
      <Textarea label="Réponses possibles" name="options" required rows={5} defaultValue={d.options} error={e.options} hint="Une réponse par ligne, de 2 à 6." />
      <Input label="Clôture" name="closesAt" type="datetime-local" required defaultValue={d.closesAt ?? closing} error={e.closesAt} />
      <SubmitButton className="self-start">Ouvrir la consultation</SubmitButton>
    </form>
  );
}
