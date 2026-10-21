"use client";
import { useActionState, useState } from "react";
import { UserRound } from "lucide-react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { updatePhoto } from "../actions";

/** Photo de la carte : aperçu immédiat de la photo choisie, puis envoi. */
export function PhotoForm({ current }: { current: string | null }) {
  const [state, action] = useActionState(updatePhoto, initialFormState);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? current;

  return (
    <form action={action} className="flex flex-wrap items-start gap-6" onSubmit={() => setPreview(null)}>
      <div className="flex h-40 w-30 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo protégée, non optimisable par next/image
          <img src={shown} alt="Ma photo d'identité" className="size-full object-cover" />
        ) : (
          <UserRound size={56} className="text-muted" aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">Photo de ma carte de membre</h2>
          <p className="text-[15px] text-muted">Une photo d'identité récente, de face, visage bien visible. JPG, PNG ou WEBP, 5 Mo maximum. Elle est recadrée automatiquement.</p>
        </div>
        <FormMessage state={state} />
        <label htmlFor="photo" className="text-sm font-semibold text-[#2b3832]">
          {current ? "Changer ma photo" : "Ajouter ma photo"} <span className="text-flame-600" aria-hidden>*</span>
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-invalid={!!state.errors?.photo}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="rounded-xl border-[1.5px] border-dashed border-[#9daaa1] bg-[#fafbf9] p-3 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-800"
        />
        <SubmitButton className="self-start" pendingLabel="Envoi…">Enregistrer la photo</SubmitButton>
      </div>
    </form>
  );
}
