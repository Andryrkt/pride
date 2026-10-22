"use client";
import { useActionState, useState } from "react";
import { OFFER_TYPES } from "@pride/shared";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState, type FormState } from "@/lib/utils";
import { proposalAction, proposeOfferAction } from "./actions";

type Action = (prev: FormState) => Promise<FormState>;

/** Bouton d'action en un clic ; après succès, il est remplacé par `doneLabel`. */
export function OneClick({ action, label, doneLabel, variant = "outline", size }: { action: Action; label: string; doneLabel: string; variant?: "primary" | "outline"; size?: "sm" }) {
  const [state, run] = useActionState(action, initialFormState);
  if (state.ok) return <span className="inline-flex min-h-10 items-center rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-800">{doneLabel}</span>;
  return (
    <form action={run} className="flex flex-col items-start gap-1.5">
      <SubmitButton variant={variant} size={size} pendingLabel="Envoi…">{label}</SubmitButton>
      {state.message && <p className="text-[13.5px] font-semibold text-flame-800">{state.message}</p>}
    </form>
  );
}

const TEXTS = {
  ATELIER: { title: "Thème de l'atelier", titleHint: "Ex. : Excel pour la gestion de budget", details: "Public visé et durée", send: "Envoyer ma proposition" },
  PROJET: { title: "Titre du projet", titleHint: "Ex. : Atelier de reboisement avec les jeunes du quartier", details: "Quel besoin de la communauté ?", send: "Soumettre au conseil d'administration" },
} as const;

/** Proposition d'atelier (page Formations) ou idée de projet (page Compétences). */
export function ProposalForm({ kind, openLabel, dark }: { kind: "ATELIER" | "PROJET"; openLabel?: string; dark?: boolean }) {
  const [open, setOpen] = useState(!openLabel);
  const [state, action] = useActionState(proposalAction.bind(null, kind), initialFormState);
  const t = TEXTS[kind];
  const d = state.data ?? {};
  const e = state.errors ?? {};
  if (state.ok) return <p role="status" className={cn("rounded-xl px-4 py-3.5 font-semibold", dark ? "text-white" : "bg-brand-50 text-brand-800")}>{state.message}</p>;
  if (!open) {
    return (
      <Button type="button" variant="white" className="self-start" onClick={() => setOpen(true)}>
        {openLabel}
      </Button>
    );
  }
  return (
    <form action={action} className={cn("flex flex-col gap-3", dark && "rounded-2xl bg-white p-4 text-ink")} noValidate>
      <RequiredLegend />
      {state.message && <FormMessage state={state} />}
      <Input label={t.title} name="title" id={`title-${kind}`} required placeholder={t.titleHint} defaultValue={d.title} error={e.title} />
      <Textarea label={t.details} name="details" id={`details-${kind}`} required rows={3} defaultValue={d.details} error={e.details} />
      <SubmitButton className="self-start" pendingLabel="Envoi…">{t.send}</SubmitButton>
    </form>
  );
}

/** « Publier une offre » : l'offre est visible après validation par un dirigeant. */
export function OfferForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(proposeOfferAction, initialFormState);
  const d = state.data ?? {};
  const e = state.errors ?? {};
  if (state.ok) return <p role="status" className="basis-full rounded-xl bg-brand-50 px-4 py-3.5 font-semibold text-brand-800">{state.message}</p>;
  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Publier une offre
      </Button>
    );
  }
  return (
    <form action={action} className="flex basis-full flex-col gap-3 border-t border-line pt-4" noValidate>
      <RequiredLegend />
      {state.message && <FormMessage state={state} />}
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <Select label="Type" name="type" required defaultValue={d.type ?? ""} error={e.type}>
          <option value="">Choisissez…</option>
          {Object.entries(OFFER_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Input label="Intitulé" name="title" id="offer-title" required placeholder="Ex. : Stage assistant comptable" defaultValue={d.title} error={e.title} />
      </div>
      <Textarea label="Description" name="description" required rows={3} placeholder="Missions, durée, profil recherché…" defaultValue={d.description} error={e.description} />
      <Input label="Lieu" name="location" id="offer-location" placeholder="Ex. : Antananarivo" defaultValue={d.location} />
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton pendingLabel="Envoi…">Proposer l'offre</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </form>
  );
}
