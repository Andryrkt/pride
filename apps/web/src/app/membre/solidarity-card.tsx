"use client";
import { useActionState, useState } from "react";
import { AIDE_SOLIDARITE, formatAriary, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS } from "@pride/shared";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FormMessage, Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { declareSolidarityAction } from "./actions";

export type SolidarityItem = { id: string; label: string; date: string; amount: number; status: string; tone: "green" | "yellow" | "red" };

/** Bloc « Solidarité » du tableau de bord : déclaration d'un événement et suivi des demandes. */
export function SolidarityCard({ requests }: { requests: SolidarityItem[] }) {
  // Chaque ouverture remonte le formulaire, pour repartir d'un état vide après un envoi.
  const [opened, setOpened] = useState(0);

  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold">Solidarité</h2>
          <p className="text-[15px] text-muted">
            Un événement heureux ou douloureux ? Déclarez-le : {formatAriary(AIDE_SOLIDARITE.membre)} pour le membre, {formatAriary(AIDE_SOLIDARITE.famille)} pour sa famille proche.
          </p>
        </div>
        {opened === 0 && (
          <Button type="button" variant="outline" onClick={() => setOpened(1)}>
            Déclarer un événement
          </Button>
        )}
      </div>
      {opened > 0 && <DeclareForm key={opened} onClose={() => setOpened(0)} onAgain={() => setOpened(opened + 1)} />}
      {requests.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-semibold">{r.label}</div>
                <div className="text-sm text-muted">{r.date} · {formatAriary(r.amount)}</div>
              </div>
              <Badge tone={r.tone}>{r.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeclareForm({ onClose, onAgain }: { onClose: () => void; onAgain: () => void }) {
  const [state, action] = useActionState(declareSolidarityAction, initialFormState);
  const d = state.data ?? {};
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-xl bg-brand-50 px-4 py-3.5 text-brand-800">{state.message}</p>
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onAgain}>Déclarer un autre événement</Button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3.5 border-t border-line pt-4" noValidate>
      <RequiredLegend />
      {state.message && <FormMessage state={state} />}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Select label="Type d'événement" name="kind" required defaultValue={d.kind ?? ""} error={e.kind}>
          <option value="">Choisissez…</option>
          {Object.entries(SOLIDARITE_EVENEMENTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Select label="Concerne" name="concerns" required defaultValue={d.concerns ?? "MEMBRE"} error={e.concerns}>
          {Object.entries(SOLIDARITE_CONCERNE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Input label="Date" name="eventDate" type="date" required defaultValue={d.eventDate} error={e.eventDate} />
      </div>
      <Textarea label="Message (facultatif)" name="message" rows={2} defaultValue={d.message} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachment" className="text-sm font-semibold text-[#2b3832]">Pièce jointe (facultatif)</label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          aria-invalid={!!e.attachment}
          aria-describedby="attachment-hint"
          className="rounded-xl border-[1.5px] border-dashed border-[#9daaa1] bg-[#fafbf9] p-3 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-800"
        />
        <p id="attachment-hint" className="text-[13px] text-muted">Certificat, faire-part, acte… · PDF ou photo, 5 Mo maximum.</p>
        {e.attachment && <p className="text-[13.5px] font-semibold text-flame-800">{e.attachment}</p>}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton pendingLabel="Envoi…">Envoyer la demande</SubmitButton>
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  );
}
