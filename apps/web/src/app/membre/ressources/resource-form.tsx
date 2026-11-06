import { RESOURCE_THEMES, type ResourceTheme } from "@pride/shared";
import { ActionForm } from "@/components/ui/action-form";
import { Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/utils";

type Values = { theme: string; title: string; summary: string; body: string; videoUrl: string | null; visibility: string; fileName: string | null };

/** Formulaire d'une ressource : publication (sans `values`) ou modification (champs préremplis). */
export function ResourceForm({ action, values, defaultTheme, submitLabel }: { action: (p: FormState, f: FormData) => Promise<FormState>; values?: Values; defaultTheme?: string; submitLabel: string }) {
  return (
    <ActionForm action={action} className="flex flex-col gap-3">
      <RequiredLegend />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Thème" name="theme" id="res-theme" required defaultValue={values?.theme ?? defaultTheme ?? ""}>
          <option value="" disabled>Choisissez…</option>
          {(Object.keys(RESOURCE_THEMES) as ResourceTheme[]).map((k) => <option key={k} value={k}>{RESOURCE_THEMES[k]}</option>)}
        </Select>
        <Input label="Titre" name="title" id="res-title" required maxLength={150} defaultValue={values?.title} placeholder="Ex. : Tenir son budget du mois" />
      </div>
      <Input label="Résumé" name="summary" id="res-summary" required maxLength={300} defaultValue={values?.summary} hint="Une ou deux phrases, affichées dans la liste (300 caractères au maximum)." />
      <Textarea label="Texte" name="body" id="res-body" required rows={8} defaultValue={values?.body} hint="Le contenu complet. Les retours à la ligne sont gardés." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Lien de la vidéo YouTube" name="videoUrl" id="res-video" type="url" defaultValue={values?.videoUrl ?? ""} placeholder="https://youtu.be/…" hint="Facultatif. Videz le champ pour retirer la vidéo." />
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>{values?.fileName ? "Remplacer la fiche PDF" : "Fiche PDF"}</span>
          <input type="file" name="file" id="res-file" accept="application/pdf" className="min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 py-2.5 font-normal" />
          <span className="text-[13px] font-normal text-muted">{values?.fileName ? `Fiche actuelle : ${values.fileName}. ` : ""}Facultatif. PDF uniquement, 10 Mo maximum.</span>
        </label>
      </div>
      {values?.fileName && (
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" name="removePdf" id="res-remove-pdf" className="size-5" />
          Retirer la fiche PDF actuelle
        </label>
      )}
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" name="vitrine" id="res-vitrine" defaultChecked={values?.visibility === "PUBLIC"} className="size-5" />
        Mettre en vitrine : visible de tous sur le site public (sinon, réservée aux membres)
      </label>
      <SubmitButton className="self-start" pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
