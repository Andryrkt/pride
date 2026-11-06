import { RESOURCE_THEMES, type ResourceTheme } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { LearnTabs, ResourceCard, ThemeFilter } from "@/components/site/resources";
import { Card } from "@/components/ui/card";
import { canPublishResources, listResources } from "@/lib/resources";
import { requireMember } from "@/lib/session";
import { publishResourceAction } from "../actions";
import { ResourceForm } from "./resource-form";

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ theme?: string; ok?: string }> }) {
  const { theme, ok } = await searchParams;
  const v = await requireMember();
  const current = theme && theme in RESOURCE_THEMES ? (theme as ResourceTheme) : undefined;
  const [items, canPublish] = await Promise.all([listResources(true, current), canPublishResources(v)]);

  return (
    <>
      <PageTitle title="Apprendre" sub="Des textes, des vidéos et des fiches à télécharger, classés par thème." />
      <LearnTabs current="ressources" />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <ThemeFilter base="/membre/ressources" current={current} />
      {items.length === 0 ? (
        <Card><p className="text-muted">Aucune ressource {current ? `sur le thème « ${RESOURCE_THEMES[current]} »` : ""} pour le moment.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => <ResourceCard key={r.id} r={r} href={`/membre/ressources/${r.id}`} />)}
        </div>
      )}

      {canPublish && (
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Publier une ressource</h2>
            <p className="text-[15px] text-muted">Réservée aux membres, sauf si vous la mettez en vitrine sur le site public. Vidéo : collez un lien YouTube (mettez-la en « non répertoriée » si elle est réservée aux membres).</p>
          </div>
          <ResourceForm action={publishResourceAction} defaultTheme={current} submitLabel="Publier la ressource" />
        </Card>
      )}
    </>
  );
}
