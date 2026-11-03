"use client";
import { useActionState } from "react";
import type { PaymentProviderId } from "@pride/shared";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { savePaymentAccountAction } from "../actions";

/** Après une erreur, les champs gardent ce qui a été saisi. */
export function AccountForm({ provider, number, holder }: { provider: PaymentProviderId; number?: string; holder?: string }) {
  const [state, action] = useActionState(savePaymentAccountAction.bind(null, provider), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Input label="Numéro" name="number" id={`number-${provider}`} type="tel" required defaultValue={state.data?.number ?? number} placeholder="034 12 345 67" error={state.errors?.number} />
      <Input label="Nom du titulaire" name="holder" id={`holder-${provider}`} required maxLength={120} defaultValue={state.data?.holder ?? holder} error={state.errors?.holder} hint="Le nom que le membre voit au moment de l'envoi." />
      <SubmitButton variant="outline" className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}
