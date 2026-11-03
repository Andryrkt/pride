"use client";
import { useActionState, useState } from "react";
import { formatAriary, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { FormMessage, Input, RequiredLegend } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { declarePaymentAction } from "../actions";

type Account = { provider: string; number: string; holder: string };

export function PayForm({ dues, accounts, defaultPhone }: { dues: { id: string; label: string; amount: number }[]; accounts: Account[]; defaultPhone: string }) {
  const [state, action] = useActionState(declarePaymentAction, initialFormState);
  const [selected, setSelected] = useState<string[]>(dues.map((d) => d.id));
  const [provider, setProvider] = useState(accounts[0]!.provider);
  const total = dues.filter((d) => selected.includes(d.id)).reduce((s, d) => s + d.amount, 0);
  const account = accounts.find((a) => a.provider === provider)!;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <RequiredLegend />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">1. Échéances à régler</legend>
        {dues.map((d) => (
          <label key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
            <input type="checkbox" name="due" value={d.id} checked={selected.includes(d.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, d.id] : selected.filter((x) => x !== d.id))} className="size-5" />
            <span className="flex-1">{d.label}</span>
            <strong>{formatAriary(d.amount)}</strong>
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">2. Opérateur</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {accounts.map((a) => (
            <label key={a.provider} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4", provider === a.provider ? "border-brand-600 bg-[#f0f8f3]" : "border-line")}>
              <input type="radio" name="provider" value={a.provider} checked={provider === a.provider} onChange={() => setProvider(a.provider)} className="size-4" />
              <span className="font-semibold">{PAYMENT_PROVIDERS[a.provider as PaymentProviderId]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1 rounded-xl bg-paper px-4 py-3">
        <span className="text-sm font-semibold">3. Envoyez l'argent depuis votre téléphone, par votre menu habituel</span>
        <span>Montant à faire arriver : <strong>{formatAriary(total)}</strong></span>
        <span>Numéro de l'association : <strong>{account.number}</strong></span>
        <span>Au nom de : <strong>{account.holder}</strong></span>
        <span className="text-[13px] text-muted">Les frais d'envoi sont à votre charge : l'association doit recevoir le montant exact. Vérifiez le nom avant de valider. Ne donnez jamais votre code secret, ni ici ni à personne.</span>
      </div>
      <p className="text-sm font-semibold">4. Une fois l'argent envoyé, déclarez votre paiement</p>
      <Input label="Numéro utilisé pour l'envoi" name="phone" type="tel" required defaultValue={state.data?.phone ?? defaultPhone} placeholder="034 12 345 67" error={state.errors?.phone} />
      <Input label="Référence de la transaction" name="reference" required maxLength={60} defaultValue={state.data?.reference} hint="Elle figure dans le SMS de confirmation de votre opérateur." error={state.errors?.reference} />
      <Input label="Capture d'écran ou SMS (facultatif)" name="proof" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" error={state.errors?.proof} hint="PDF, JPG, PNG ou WEBP, 5 Mo maximum." />
      <SubmitButton pendingLabel="Envoi de la déclaration…" className="self-start" disabled={total === 0}>
        J'ai envoyé {formatAriary(total)} : déclarer
      </SubmitButton>
      <p className="text-[13px] text-muted">Votre reçu sera créé dès que l'association aura vérifié la réception de l'argent. Vous pouvez aussi payer en espèces auprès du comptable ou du Trésorier.</p>
    </form>
  );
}
