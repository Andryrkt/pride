"use client";
import Link from "next/link";
import { useActionState, useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { CV_LANGUAGE_LEVELS, type Cv } from "@pride/shared";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, initialFormState } from "@/lib/utils";
import { saveCvAction } from "../actions";

const EMPTY = {
  experiences: { role: "", org: "", period: "", description: "" },
  education: { diploma: "", school: "", year: "" },
  languages: { name: "", level: "Courant" as Cv["languages"][number]["level"] },
};
type ListKey = keyof typeof EMPTY;
type Person = { name: string; contact: string[]; skills: string[]; photo: string | null };

/** Texte modifiable « sur place » : ressemble au texte du CV, se révèle au survol et au clic. Hauteur ajustée au contenu. */
function Editable({ value, onChange, label, placeholder, required, error, multiline, inline, dark, className }: {
  value: string; onChange: (v: string) => void; label: string; placeholder: string; required?: boolean; error?: string; multiline?: boolean; inline?: boolean; dark?: boolean; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (t) { t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={label}
      title={error ?? label}
      aria-invalid={!!error}
      placeholder={placeholder}
      required={required}
      value={value}
      // Une seule ligne : la touche Entrée ne crée pas de retour à la ligne.
      onKeyDown={(e) => !multiline && e.key === "Enter" && e.preventDefault()}
      onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\n/g, " "))}
      className={cn(
        // inline : largeur du texte (field-sizing ; un navigateur qui ne le connaît pas garde une ligne pleine).
        inline ? "mx-0 inline-block max-w-full min-w-16 [field-sizing:content]" : "-mx-1 block w-[calc(100%+0.5rem)]",
        "resize-none overflow-hidden rounded bg-transparent px-1 outline-none placeholder:italic focus:ring-2",
        dark ? "placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:ring-white/70" : "placeholder:text-[#9aa39e] hover:bg-[#eef3ef] focus:bg-[#eef3ef] focus:ring-brand-600",
        error && "ring-2 ring-flame-600",
        className,
      )}
    />
  );
}

/** Petit bouton d'action dans le CV (ajouter, retirer) ; toujours visible sur téléphone, au survol sur ordinateur. */
function Tool({ onClick, label, children, dark, hover }: { onClick: () => void; label: string; children: React.ReactNode; dark?: boolean; hover?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold",
        dark ? "text-white/80 hover:bg-white/15" : "text-brand-700 hover:bg-brand-50",
        hover && "lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

/** Éditeur visuel du CV : même mise en page que le PDF (`lib/cv.ts`), chaque texte se modifie en cliquant dessus. Envoyé en JSON. */
export function CvForm({ initial, person }: { initial: Cv; person: Person }) {
  const [cv, setCv] = useState<Cv>(initial);
  const [state, action] = useActionState(saveCvAction, initialFormState);
  const e = state.errors ?? {};
  const set = <K extends keyof Cv>(k: K, v: Cv[K]) => setCv((c) => ({ ...c, [k]: v }));
  const setRow = (k: ListKey, i: number, field: string, v: string) =>
    setCv((c) => ({ ...c, [k]: (c[k] as object[]).map((r, j) => (j === i ? { ...r, [field]: v } : r)) }));
  const add = (k: ListKey) => setCv((c) => ({ ...c, [k]: [...c[k], { ...EMPTY[k] }] }));
  const remove = (k: ListKey, i: number) => setCv((c) => ({ ...c, [k]: (c[k] as object[]).filter((_, j) => j !== i) }));

  const sideTitle = "mb-2 border-b border-white/40 pb-1 text-[13px] font-bold tracking-wider text-white uppercase";
  const mainTitle = "mb-3 border-b-2 border-[#0b3f2a] pb-1 text-[15px] font-bold tracking-wide text-[#0b3f2a] uppercase";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="cv" value={JSON.stringify(cv)} />
      <FormMessage state={state} />

      <div className="mx-auto grid w-full max-w-[860px] overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] md:grid-cols-[32%_1fr]">
        {/* Colonne verte : photo, contact et compétences (de la fiche), langues et centres d'intérêt (modifiables) */}
        <aside className="flex flex-col gap-6 bg-[#0b3f2a] p-6 text-[13.5px] text-[#dcefe3]">
          <div className="flex flex-col items-center gap-2">
            {cv.showPhoto && person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API
              <img src={person.photo} alt="Ma photo" className="h-36 w-27 object-cover" />
            ) : (
              <div className="flex h-36 w-27 flex-col items-center justify-center gap-1 border-2 border-dashed border-white/40 text-center text-[12px] leading-tight">
                <UserRound size={28} aria-hidden />
                {person.photo ? "Sans photo" : <Link href="/membre/profil" className="underline">Ajouter ma photo</Link>}
              </div>
            )}
            {person.photo && (
              <label className="flex items-center gap-2 text-[12.5px]">
                <input type="checkbox" checked={cv.showPhoto} onChange={(ev) => set("showPhoto", ev.target.checked)} className="size-4 accent-white" />
                Mettre ma photo
              </label>
            )}
          </div>

          <section>
            <h2 className={sideTitle}>Contact</h2>
            {person.contact.map((c) => <p key={c} className="break-words">{c}</p>)}
            <Link href="/membre/profil" className="mt-1 inline-block text-[12px] text-white/70 underline">Modifier dans Mon profil</Link>
          </section>

          <section>
            <h2 className={sideTitle}>Compétences</h2>
            {person.skills.length ? person.skills.map((s) => <p key={s}>• {s}</p>) : <p className="italic text-white/60">Aucune pour l&apos;instant.</p>}
            <Link href="/membre/profil" className="mt-1 inline-block text-[12px] text-white/70 underline">Modifier dans Mon profil</Link>
          </section>

          <section>
            <h2 className={sideTitle}>Langues</h2>
            <div className="flex flex-col gap-2">
              {cv.languages.map((l, i) => (
                <div key={i} className="group flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <Editable dark label="Langue" placeholder="Langue" required value={l.name} onChange={(v) => setRow("languages", i, "name", v)} error={e[`languages.${i}.name`]} className="font-bold" />
                    <select aria-label="Niveau" value={l.level} onChange={(ev) => setRow("languages", i, "level", ev.target.value)} className="-mx-1 rounded bg-transparent px-0.5 text-[12.5px] outline-none hover:bg-white/10 focus:ring-2 focus:ring-white/70 [&>option]:text-ink">
                      {CV_LANGUAGE_LEVELS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  <Tool dark hover onClick={() => remove("languages", i)} label="Retirer cette langue"><Trash2 className="size-4" aria-hidden /></Tool>
                </div>
              ))}
              {cv.languages.length < 6 && <Tool dark onClick={() => add("languages")} label="Ajouter une langue"><Plus className="size-4" aria-hidden /> Langue</Tool>}
            </div>
          </section>

          <section>
            <h2 className={sideTitle}>Centres d&apos;intérêt</h2>
            <Editable dark multiline label="Centres d'intérêt" placeholder="Facultatif : lecture, football, bénévolat…" value={cv.interests} onChange={(v) => set("interests", v)} error={e.interests} />
          </section>
        </aside>

        {/* Colonne principale */}
        <div className="flex flex-col gap-6 p-6 text-[14.5px] text-[#1f1f1f] md:p-8">
          <header>
            <p className="text-[26px] leading-tight font-bold">{person.name}</p>
            <Editable label="Titre du CV" placeholder="Titre du CV : poste ou domaine visé (ex. : Assistant comptable)" required value={cv.title} onChange={(v) => set("title", v)} error={e.title} className="text-[17px] text-[#0b3f2a]" />
          </header>

          <section>
            <h2 className={mainTitle}>Profil</h2>
            <Editable multiline label="Profil" placeholder="Facultatif : 3 ou 4 phrases sur qui vous êtes, ce que vous savez faire, ce que vous cherchez." value={cv.summary} onChange={(v) => set("summary", v)} error={e.summary} />
          </section>

          <section>
            <h2 className={mainTitle}>Expériences</h2>
            <div className="flex flex-col gap-4">
              {cv.experiences.map((x, i) => (
                <div key={i} className="group relative">
                  <div className="flex items-start gap-2">
                    <Editable label="Poste ou mission" placeholder="Poste ou mission" required value={x.role} onChange={(v) => setRow("experiences", i, "role", v)} error={e[`experiences.${i}.role`]} className="font-bold" />
                    <Tool hover onClick={() => remove("experiences", i)} label="Retirer cette expérience"><Trash2 className="size-4" aria-hidden /></Tool>
                  </div>
                  <div className="flex flex-wrap items-start gap-x-1 text-[13px] text-[#5f6663]">
                    <Editable inline label="Organisme" placeholder="Organisme" required value={x.org} onChange={(v) => setRow("experiences", i, "org", v)} error={e[`experiences.${i}.org`]} />
                    <span aria-hidden>·</span>
                    <Editable inline label="Période" placeholder="Période (ex. : 2024 – aujourd'hui)" required value={x.period} onChange={(v) => setRow("experiences", i, "period", v)} error={e[`experiences.${i}.period`]} />
                  </div>
                  <Editable multiline label="Ce que vous avez fait" placeholder="Ce que vous avez fait (facultatif)" value={x.description} onChange={(v) => setRow("experiences", i, "description", v)} error={e[`experiences.${i}.description`]} className="mt-1 text-[13.5px]" />
                </div>
              ))}
              {cv.experiences.length === 0 && <p className="text-[13.5px] italic text-[#9aa39e]">Emplois, stages, bénévolat, missions dans une commission PRIDe…</p>}
              {cv.experiences.length < 10 && <Tool onClick={() => add("experiences")} label="Ajouter une expérience"><Plus className="size-4" aria-hidden /> Ajouter une expérience</Tool>}
            </div>
          </section>

          <section>
            <h2 className={mainTitle}>Formation</h2>
            <div className="flex flex-col gap-4">
              {cv.education.map((x, i) => (
                <div key={i} className="group">
                  <div className="flex items-start gap-2">
                    <Editable label="Diplôme ou formation" placeholder="Diplôme ou formation" required value={x.diploma} onChange={(v) => setRow("education", i, "diploma", v)} error={e[`education.${i}.diploma`]} className="font-bold" />
                    <Tool hover onClick={() => remove("education", i)} label="Retirer cette formation"><Trash2 className="size-4" aria-hidden /></Tool>
                  </div>
                  <div className="flex flex-wrap items-start gap-x-1 text-[13px] text-[#5f6663]">
                    <Editable inline label="Établissement" placeholder="Établissement" required value={x.school} onChange={(v) => setRow("education", i, "school", v)} error={e[`education.${i}.school`]} />
                    <span aria-hidden>·</span>
                    <Editable inline label="Année" placeholder="Année" required value={x.year} onChange={(v) => setRow("education", i, "year", v)} error={e[`education.${i}.year`]} />
                  </div>
                </div>
              ))}
              {cv.education.length < 8 && <Tool onClick={() => add("education")} label="Ajouter une formation"><Plus className="size-4" aria-hidden /> Ajouter une formation</Tool>}
            </div>
          </section>
        </div>
      </div>

      {/* Barre d'enregistrement toujours visible en bas de l'écran */}
      <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="hidden text-[13.5px] text-muted sm:block">Les textes en gris italique sont des exemples : ils n&apos;apparaissent pas dans le PDF. Les liens et boutons du CV non plus.</p>
        <SubmitButton pendingLabel="Enregistrement…" className="max-sm:w-full">Enregistrer mon CV</SubmitButton>
      </div>
    </form>
  );
}
