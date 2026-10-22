"use client";
import { useActionState } from "react";
import { FormMessage, Input, RequiredLegend } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { updateProfile } from "../actions";

export function ProfileForm({ initial, shareSkills }: { initial: Record<string, string>; shareSkills: boolean }) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <RequiredLegend />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Téléphone" name="phone" required defaultValue={initial.phone} error={e.phone} />
        <Input label="Quartier / ville" name="address" required defaultValue={initial.address} error={e.address} />
        <Input label="Profession ou études" name="profession" defaultValue={initial.profession} />
        <Input label="Compétences partagées" name="skills" defaultValue={initial.skills} hint="Séparées par des virgules" error={e.skills} />
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-paper p-4 text-[15px]">
        <input type="checkbox" name="shareSkills" defaultChecked={shareSkills} className="mt-1 size-5" />
        <span>
          <strong>Apparaître dans l'annuaire des compétences</strong>
          <br />
          <span className="text-muted">Les autres membres voient mon prénom, l'initiale de mon nom, ma profession et mes compétences, et peuvent me demander un coup de main. Mes coordonnées ne sont pas affichées.</span>
        </span>
      </label>
      <SubmitButton className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}
