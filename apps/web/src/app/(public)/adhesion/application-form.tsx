"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip, X } from "lucide-react";
import { DOCUMENT_KINDS, TARIFS, formatAriary, type DocumentKind } from "@pride/shared";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { FormMessage, Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { submitApplication } from "./actions";

type Sponsor = { id: string; name: string };

function ageFrom(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

function UploadTile({ kind, error, onFile }: { kind: DocumentKind; error?: string; onFile: (has: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const name = `doc_${kind}`;
  const pick = (f: File | null) => {
    setFile(f);
    onFile(!!f);
  };
  // React vide les champs fichier après chaque envoi (même refusé) : la tuile doit suivre.
  useEffect(() => {
    const form = input.current?.form;
    const clear = () => pick(null);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  });
  return (
    <div className="flex flex-col gap-1">
      <label
        className={cn(
          "relative flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] p-3",
          file ? "border-brand-600 bg-[#f0f8f3]" : "border-dashed border-[#9daaa1] bg-[#fafbf9] hover:border-brand-600",
          error && !file && "border-flame-600",
        )}
      >
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", file ? "bg-flame-600 text-xs font-extrabold text-white" : "bg-brand-50 text-brand-800")}>
          {file ? (file.name.split(".").pop() ?? "").slice(0, 4).toUpperCase() : <Paperclip size={20} aria-hidden />}
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="text-[15px]">
            {DOCUMENT_KINDS[kind]} <span className="text-flame-600" aria-hidden>*</span>
          </strong>
          <span className="truncate text-[13px] text-muted">{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} Ko` : "PDF ou photo, 5 Mo max"}</span>
        </span>
        <input
          ref={input}
          type="file"
          name={name}
          accept="application/pdf,image/jpeg,image/png,image/webp"
          aria-label={DOCUMENT_KINDS[kind]}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file && (
          <button
            type="button"
            aria-label={`Retirer ${DOCUMENT_KINDS[kind]}`}
            className="relative z-10 ml-auto flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-brand-50"
            onClick={(ev) => {
              ev.preventDefault();
              if (input.current) input.current.value = "";
              pick(null);
            }}
          >
            <X size={20} aria-hidden />
          </button>
        )}
      </label>
      {error && !file && <p className="text-[13.5px] font-semibold text-flame-800">{error}</p>}
    </div>
  );
}

export function ApplicationForm({ sponsors }: { sponsors: Sponsor[] }) {
  const [state, action] = useActionState(submitApplication, initialFormState);
  const d = state.data ?? {};
  const e = state.errors ?? {};
  const [birth, setBirth] = useState(d.birthDate ?? "");
  const [sponsorship, setSponsorship] = useState<"PARRAIN" | "ENTRETIEN">((d.sponsorship as "PARRAIN") ?? "PARRAIN");
  const [consent, setConsent] = useState(false);
  const [category, setCategory] = useState<"ACTIF" | "BIENFAITEUR">((d.category as "ACTIF") ?? "ACTIF");
  const [docs, setDocs] = useState<Partial<Record<DocumentKind, boolean>>>({});
  const age = ageFrom(birth);
  const minor = age !== null && age < 18;
  const kinds: DocumentKind[] = ["RESIDENCE", minor ? "ACTE_NAISSANCE" : "CIN", "CV", "LETTRE"];
  const nDocs = kinds.filter((k) => docs[k]).length;
  const tarif = TARIFS[minor ? "ACTIF_MINEUR" : category];

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <CheckCircle2 size={56} className="text-brand-600" aria-hidden />
        <h2 className="text-3xl font-extrabold">Candidature envoyée</h2>
        <p className="text-[#2b3832]">
          Votre dossier porte la référence <strong>{state.message}</strong>. {d.email ? "Une confirmation vous a été envoyée par e-mail." : "Notez-la pour le suivi."} Prochaines étapes : parrainage ou entretien, décision du conseil d'administration, puis paiement du droit d'entrée.
        </p>
        <ButtonLink href="/" variant="outline" className="self-start">Retour à l'accueil</ButtonLink>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <RequiredLegend />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nom" name="lastName" required defaultValue={d.lastName} error={e.lastName} autoComplete="family-name" />
        <Input label="Prénoms" name="firstNames" required defaultValue={d.firstNames} error={e.firstNames} autoComplete="given-name" />
        <Input label="Date de naissance" name="birthDate" type="date" required value={birth} onChange={(ev) => setBirth(ev.target.value)} error={e.birthDate} />
        <Input label="Téléphone" name="phone" type="tel" required placeholder="034 12 345 67" defaultValue={d.phone} error={e.phone} autoComplete="tel" />
        <Input label="E-mail" name="email" type="email" defaultValue={d.email} error={e.email} hint="Facultatif, mais nécessaire pour accéder à l'espace membre en ligne" autoComplete="email" />
        <Input label="Quartier / ville" name="address" required defaultValue={d.address} error={e.address} placeholder="Analamahitsy, Antananarivo" />
        <Input label="Profession ou études" name="profession" defaultValue={d.profession} />
      </div>
      {!minor && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Catégorie souhaitée</legend>
          <div className="flex flex-wrap gap-2">
            {(["ACTIF", "BIENFAITEUR"] as const).map((v) => (
              <label key={v} className={cn("cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold ring-[1.5px] ring-inset", category === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5]")}>
                <input type="radio" name="category" value={v} checked={category === v} onChange={() => setCategory(v)} className="sr-only" />
                {TARIFS[v].label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {minor && (
        <div className="grid gap-4 rounded-2xl border border-[#f1c9c3] bg-[#fff7f5] p-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-[15px]">Candidat mineur : l'un de vos parents ou votre tuteur doit être membre et accepter votre adhésion (cotisation 5 000 Ar / mois).</p>
          <Input label="Nom du parent ou tuteur membre" name="parentName" required defaultValue={d.parentName} error={e.parentName} />
          <Input label="Son numéro de membre" name="parentMemberNumber" required placeholder="PR-2025-0031" defaultValue={d.parentMemberNumber} error={e.parentMemberNumber} />
        </div>
      )}
      <Input label="Compétences que je peux partager" name="skills" defaultValue={d.skills} placeholder="Ex. : Excel, anglais, couture, comptabilité…" />
      <Textarea label="Ce que j'attends de PRIDe" name="expectations" defaultValue={d.expectations} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">
          Parrainage <span className="text-flame-600" aria-hidden>*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {(["PARRAIN", "ENTRETIEN"] as const).map((v) => (
            <label key={v} className={cn("cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold ring-[1.5px] ring-inset", sponsorship === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-[#c3ccc5]")}>
              <input type="radio" name="sponsorship" value={v} checked={sponsorship === v} onChange={() => setSponsorship(v)} className="sr-only" />
              {v === "PARRAIN" ? "J'ai un parrain au conseil d'administration" : "Je souhaite un entretien"}
            </label>
          ))}
        </div>
        {sponsorship === "PARRAIN" ? (
          <Select label="Mon parrain" name="sponsorMemberId" required defaultValue={d.sponsorMemberId ?? ""} error={e.sponsorMemberId}>
            <option value="">Choisissez…</option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        ) : (
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-[15px] text-brand-800">Deux membres du conseil d'administration vous contacteront pour fixer la date de l'entretien.</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Pièces du dossier</span>
          <Badge tone={nDocs === kinds.length ? "green" : "gray"}>{nDocs} / {kinds.length} pièces jointes</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {kinds.map((k) => (
            <UploadTile key={k} kind={k} error={e[`doc_${k}`]} onFile={(has) => setDocs((prev) => ({ ...prev, [k]: has }))} />
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="consent" className="mt-1 size-5" required checked={consent} onChange={(ev) => setConsent(ev.target.checked)} />
        <span>
          J'accepte que mes données soient utilisées uniquement pour la gestion de mon adhésion (loi n° 2014-038 sur la protection des données personnelles). <span className="text-flame-600">*</span>
        </span>
      </label>
      {e.consent && !consent && <p className="-mt-4 text-[13.5px] font-semibold text-flame-800">{e.consent}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-paper p-4">
        <div>
          <div className="text-[13px] text-muted">À payer après l'agrément</div>
          <div className="text-[17px] font-bold">
            Droit d'entrée {formatAriary(tarif.droitEntree)} + cotisation {formatAriary(tarif.cotisationMensuelle)} / mois
          </div>
        </div>
        <SubmitButton>Envoyer ma candidature</SubmitButton>
      </div>
    </form>
  );
}
