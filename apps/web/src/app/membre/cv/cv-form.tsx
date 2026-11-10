"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CV_LANGUAGE_LEVELS, type Cv } from "@pride/shared";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/utils";
import { saveCvAction } from "../actions";

const EMPTY = {
  experiences: { role: "", org: "", period: "", description: "" },
  education: { diploma: "", school: "", year: "" },
  languages: { name: "", level: "Courant" as Cv["languages"][number]["level"] },
};
type ListKey = keyof typeof EMPTY;

/** Formulaire du CV : rubriques à lignes répétables (expériences, formations, langues), envoyé en JSON. */
export function CvForm({ initial, hasPhoto }: { initial: Cv; hasPhoto: boolean }) {
  const [cv, setCv] = useState<Cv>(initial);
  const [state, action] = useActionState(saveCvAction, initialFormState);
  const e = state.errors ?? {};
  const set = <K extends keyof Cv>(k: K, v: Cv[K]) => setCv((c) => ({ ...c, [k]: v }));
  const setRow = <K extends ListKey>(k: K, i: number, field: string, v: string) =>
    setCv((c) => ({ ...c, [k]: (c[k] as object[]).map((r, j) => (j === i ? { ...r, [field]: v } : r)) }));
  const add = (k: ListKey) => setCv((c) => ({ ...c, [k]: [...c[k], { ...EMPTY[k] }] }));
  const remove = (k: ListKey, i: number) => setCv((c) => ({ ...c, [k]: (c[k] as object[]).filter((_, j) => j !== i) }));

  const Remove = ({ k, i, what }: { k: ListKey; i: number; what: string }) => (
    <Button type="button" variant="outline" size="sm" onClick={() => remove(k, i)} className="self-start">
      <Trash2 className="size-4" aria-hidden /> Retirer {what}
    </Button>
  );
  const Add = ({ k, label, max }: { k: ListKey; label: string; max: number }) =>
    cv[k].length < max ? (
      <Button type="button" variant="outline" size="sm" onClick={() => add(k)} className="self-start">
        <Plus className="size-4" aria-hidden /> {label}
      </Button>
    ) : null;
  const section = "flex flex-col gap-3 border-t border-line pt-5";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="cv" value={JSON.stringify(cv)} />
      <FormMessage state={state} />
      <RequiredLegend />

      <div className="flex flex-col gap-3">
        <Input label="Titre du CV" name="title" required value={cv.title} onChange={(ev) => set("title", ev.target.value)} error={e.title} hint="Le poste ou le domaine visé. Ex. : Assistant comptable, Développeuse web junior." />
        <Textarea label="Profil" name="summary" rows={4} value={cv.summary} onChange={(ev) => set("summary", ev.target.value)} error={e.summary} hint="3 ou 4 phrases : qui vous êtes, ce que vous savez faire, ce que vous cherchez." />
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" checked={cv.showPhoto} onChange={(ev) => set("showPhoto", ev.target.checked)} className="size-5 accent-brand-600" />
          Mettre ma photo sur le CV{!hasPhoto && " (ajoutez-la d'abord dans « Mon profil »)"}
        </label>
      </div>

      <fieldset className={section}>
        <legend className="mb-2 text-lg font-bold">Expériences</legend>
        <p className="text-sm text-muted">Emplois, stages, bénévolat, missions dans une commission PRIDe… du plus récent au plus ancien.</p>
        {cv.experiences.map((x, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Poste ou mission" name={`exp-role-${i}`} required value={x.role} onChange={(ev) => setRow("experiences", i, "role", ev.target.value)} error={e[`experiences.${i}.role`]} />
              <Input label="Organisme" name={`exp-org-${i}`} required value={x.org} onChange={(ev) => setRow("experiences", i, "org", ev.target.value)} error={e[`experiences.${i}.org`]} />
            </div>
            <Input label="Période" name={`exp-period-${i}`} required value={x.period} onChange={(ev) => setRow("experiences", i, "period", ev.target.value)} error={e[`experiences.${i}.period`]} hint="Ex. : mars 2024 – aujourd'hui" />
            <Textarea label="Ce que vous avez fait" name={`exp-desc-${i}`} rows={3} value={x.description} onChange={(ev) => setRow("experiences", i, "description", ev.target.value)} error={e[`experiences.${i}.description`]} />
            <Remove k="experiences" i={i} what="cette expérience" />
          </div>
        ))}
        <Add k="experiences" label="Ajouter une expérience" max={10} />
      </fieldset>

      <fieldset className={section}>
        <legend className="mb-2 text-lg font-bold">Formation</legend>
        {cv.education.map((x, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr]">
              <Input label="Diplôme ou formation" name={`edu-diploma-${i}`} required value={x.diploma} onChange={(ev) => setRow("education", i, "diploma", ev.target.value)} error={e[`education.${i}.diploma`]} />
              <Input label="Établissement" name={`edu-school-${i}`} required value={x.school} onChange={(ev) => setRow("education", i, "school", ev.target.value)} error={e[`education.${i}.school`]} />
              <Input label="Année" name={`edu-year-${i}`} required value={x.year} onChange={(ev) => setRow("education", i, "year", ev.target.value)} error={e[`education.${i}.year`]} />
            </div>
            <Remove k="education" i={i} what="cette formation" />
          </div>
        ))}
        <Add k="education" label="Ajouter une formation" max={8} />
      </fieldset>

      <fieldset className={section}>
        <legend className="mb-2 text-lg font-bold">Langues</legend>
        {cv.languages.map((x, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-2xl border border-line p-4">
            <Input label="Langue" name={`lang-name-${i}`} required value={x.name} onChange={(ev) => setRow("languages", i, "name", ev.target.value)} error={e[`languages.${i}.name`]} className="min-w-40 flex-1" />
            <Select label="Niveau" name={`lang-level-${i}`} value={x.level} onChange={(ev) => setRow("languages", i, "level", ev.target.value)} className="min-w-40 flex-1">
              {CV_LANGUAGE_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </Select>
            <Remove k="languages" i={i} what="" />
          </div>
        ))}
        <Add k="languages" label="Ajouter une langue" max={6} />
      </fieldset>

      <div className={section}>
        <Textarea label="Centres d'intérêt" name="interests" rows={2} value={cv.interests} onChange={(ev) => set("interests", ev.target.value)} error={e.interests} hint="Facultatif. Ex. : lecture, football, bénévolat." />
      </div>

      <SubmitButton className="self-start" pendingLabel="Enregistrement…">Enregistrer mon CV</SubmitButton>
    </form>
  );
}
