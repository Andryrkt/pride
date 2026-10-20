"use client";
import { useActionState, useState } from "react";
import { FormMessage, Input, RequiredLegend, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { publishPostAction } from "../actions";

const pill = (on: boolean) => cn("cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold ring-[1.5px] ring-inset", on ? "bg-brand-800 text-white ring-brand-800" : "bg-white ring-[#c3ccc5]");

export function PublishForm() {
  const [state, action] = useActionState(publishPostAction, initialFormState);
  const [type, setType] = useState("ARTICLE");
  const [vis, setVis] = useState("PUBLIC");
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <RequiredLegend />
      <FormMessage state={state} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-semibold">Type de contenu</legend>
        {[["ARTICLE", "Article"], ["EVENEMENT", "Événement"], ["ANNONCE", "Annonce"]].map(([v, l]) => (
          <label key={v} className={pill(type === v)}>
            <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v!)} className="sr-only" />
            {l}
          </label>
        ))}
      </fieldset>
      <Input label="Titre" name="title" required error={e.title} />
      {type === "EVENEMENT" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date et heure" name="eventAt" type="datetime-local" required error={e.eventAt} />
          <Input label="Lieu" name="location" placeholder="CLT Tsiadana" />
        </div>
      )}
      <Textarea label="Texte" name="body" required error={e.body} hint="Le premier paragraphe sert de résumé." />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Qui peut voir ce contenu ?</legend>
        {[["PUBLIC", "Tout le monde", "Site public et espace membres"], ["MEMBRES", "Membres seulement", "Uniquement dans l'espace membres"]].map(([v, t, d]) => (
          <label key={v} className={cn("flex cursor-pointer flex-col rounded-2xl border-[1.5px] p-4", vis === v ? "border-brand-600 bg-[#f0f8f3]" : "border-line")}>
            <span className="flex items-center gap-2 font-bold"><input type="radio" name="visibility" value={v} checked={vis === v} onChange={() => setVis(v!)} className="size-4" />{t}</span>
            <span className="text-sm text-muted">{d}</span>
          </label>
        ))}
      </fieldset>
      <SubmitButton className="self-start">Publier</SubmitButton>
    </form>
  );
}
