import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { archivedDocuments, currentDocuments, DOCUMENT_TYPES, type DocumentType } from "@/lib/documents";
import { canManageAssemblies, requireDirigeant } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { archiveDocumentAction, publishDocumentAction } from "./actions";

const label = (kind: string) => DOCUMENT_TYPES[kind as DocumentType]?.label ?? kind;

/** Documents officiels : publiés sur le site public et dans l'espace membres ; les anciennes versions sont archivées. */
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const v = await requireDirigeant();
  const canPublish = canManageAssemblies(v);
  const [current, archived] = await Promise.all([currentDocuments(true), archivedDocuments()]);

  return (
    <>
      <PageTitle title="Documents officiels" sub="Statuts, règlement intérieur, procès-verbaux et rapports : publiés sur le site public ou réservés aux membres. Une nouvelle version des statuts ou du règlement archive l'ancienne." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      {canPublish && (
        <Card>
          <h2 className="mb-3 text-xl font-bold">Publier un document</h2>
          <ActionForm action={publishDocumentAction}>
            <RequiredLegend />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Type de document" name="kind" required defaultValue="">
                <option value="">Choisissez…</option>
                {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((k) => <option key={k} value={k}>{DOCUMENT_TYPES[k].label}</option>)}
              </Select>
              <Input label="Titre" name="title" required placeholder="Ex. : Statuts de l'association" />
              <Input label="Description" name="description" placeholder="Ex. : Version modifiée par l'AG extraordinaire" />
              <Input label="Date d'adoption" name="adoptedOn" type="date" hint="Date de l'AG ou de la réunion qui l'a adopté" />
              <Select label="Visible par" name="visibility" defaultValue="PUBLIC">
                <option value="PUBLIC">Tout le monde (site public et espace membres)</option>
                <option value="MEMBRES">Membres seulement</option>
              </Select>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                <span>Fichier PDF <span className="text-flame-600" aria-hidden>*</span><span className="sr-only">champ obligatoire</span></span>
                <input type="file" name="file" accept="application/pdf" required className="min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 py-2.5 font-normal" />
                <span className="text-[13px] font-normal text-muted">PDF uniquement, 10 Mo maximum.</span>
              </label>
            </div>
            <label className="flex items-center gap-3 text-[15px]">
              <input type="checkbox" name="announce" defaultChecked className="size-5" />
              Prévenir les membres : actualité et e-mail à tous les membres actifs
            </label>
            <SubmitButton className="self-start" pendingLabel="Publication…">Publier</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">En vigueur ({current.length})</h2>
        {current.length === 0 && <p className="text-muted">Aucun document publié pour le moment.</p>}
        <ul className="divide-y divide-line">
          {current.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col">
                <a href={`/api/documents/${d.id}`} target="_blank" className="font-semibold text-brand-600 hover:underline">{d.title}</a>
                <span className="text-sm text-muted">{label(d.kind)}{d.adoptedOn ? ` · adopté le ${formatDate(d.adoptedOn)}` : ""} · publié le {formatDate(d.publishedAt)}{d.description ? ` · ${d.description}` : ""}</span>
              </div>
              <span className="flex items-center gap-3">
                <Badge tone={d.visibility === "MEMBRES" ? "dark" : "green"}>{d.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}</Badge>
                {canPublish && (
                  <ActionForm action={archiveDocumentAction.bind(null, d.id)} className="flex flex-col items-end gap-1">
                    <SubmitButton size="sm" variant="ghost">Retirer</SubmitButton>
                  </ActionForm>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {archived.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Archives ({archived.length})</h2>
          <p className="text-sm text-muted">Anciennes versions et documents retirés : ils restent consultables, jamais supprimés.</p>
          <ul className="divide-y divide-line">
            {archived.map((d) => (
              <li key={d.id} className="flex flex-col py-2">
                <a href={`/api/documents/${d.id}`} target="_blank" className="font-semibold text-brand-600 hover:underline">{d.title}</a>
                <span className="text-sm text-muted">{label(d.kind)} · publié le {formatDate(d.publishedAt)} · archivé le {formatDate(d.archivedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
