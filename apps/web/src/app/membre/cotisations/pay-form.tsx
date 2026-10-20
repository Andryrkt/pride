"use client";
import { useActionState, useState } from "react";
import { formatAriary, PAYMENT_PROVIDERS } from "@pride/shared";
import { FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { payAction } from "../actions";

export function PayForm({ dues, defaultPhone }: { dues: { id: string; label: string; amount: number }[]; defaultPhone: string }) {
  const [state, action] = useActionState(payAction, initialFormState);
  const [selected, setSelected] = useState<string[]>(dues.map((d) => d.id));
  const [provider, setProvider] = useState("MVOLA");
  const total = dues.filter((d) => selected.includes(d.id)).reduce((s, d) => s + d.amount, 0);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Échéances à régler</legend>
        {dues.map((d) => (
          <label key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
            <input type="checkbox" name="due" value={d.id} checked={selected.includes(d.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, d.id] : selected.filter((x) => x !== d.id))} className="size-5" />
            <span className="flex-1">{d.label}</span>
            <strong>{formatAriary(d.amount)}</strong>
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Opérateur</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(PAYMENT_PROVIDERS).map(([id, label]) => (
            <label key={id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4", provider === id ? "border-brand-600 bg-[#f0f8f3]" : "border-line")}>
              <input type="radio" name="provider" value={id} checked={provider === id} onChange={() => setProvider(id)} className="size-4" />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Input label="Numéro à débiter" name="phone" type="tel" required defaultValue={defaultPhone} placeholder="034 12 345 67" error={state.errors?.phone} />
      <SubmitButton pendingLabel="Paiement en cours…" className="self-start" disabled={total === 0}>
        Payer {formatAriary(total)}
      </SubmitButton>
      <p className="text-[13px] text-muted">Vous recevrez une demande de validation sur votre téléphone, puis votre reçu par SMS.</p>
    </form>
  );
}
