import { RESOURCE_THEMES, type ResourceTheme } from "@pride/shared";
import { PageHero } from "@/components/site/page-hero";
import { ResourceCard, ThemeFilter } from "@/components/site/resources";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listResources } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ressources" };

/** Vitrine : les ressources que la Commission formation et projets rend publiques. */
export default async function PublicResourcesPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const { theme } = await searchParams;
  const current = theme && theme in RESOURCE_THEMES ? (theme as ResourceTheme) : undefined;
  const items = await listResources(false, current);
  return (
    <>
      <PageHero eyebrow="Ressources" title="Apprendre avec PRIDe" actions={<ButtonLink href="/adhesion">Devenir membre pour tout voir</ButtonLink>}>
        <p className="text-[17px] text-muted">Une sélection de fiches, de textes et de vidéos préparés par nos membres. Les membres ont accès à toutes les ressources dans leur espace.</p>
      </PageHero>
      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-14 sm:px-6">
        <ThemeFilter base="/ressources" current={current} />
        {items.length === 0 ? (
          <Card><p className="text-muted">Aucune ressource publique pour le moment.</p></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => <ResourceCard key={r.id} r={r} href={`/ressources/${r.id}`} />)}
          </div>
        )}
      </section>
    </>
  );
}
