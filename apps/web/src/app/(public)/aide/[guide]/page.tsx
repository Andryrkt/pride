import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { GUIDES, isGuide } from "@/content/guides";
import { guideFor } from "@/lib/help";

export async function generateMetadata({ params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params;
  return { title: isGuide(guide) ? `Aide · ${GUIDES[guide].title}` : "Aide" };
}

export default async function GuideIndex({ params }: { params: Promise<{ guide: string }> }) {
  const g = await guideFor((await params).guide);
  return (
    <>
      <PageHero
        eyebrow="Aide"
        title={g.title}
        actions={
          <>
            <ButtonLink href={`/aide/${g.key}/imprimer`} variant="outline">Imprimer tout le guide</ButtonLink>
            <ButtonLink href="/aide" variant="ghost">Tous les guides</ButtonLink>
          </>
        }
      >
        {g.intro}
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-2">
          {g.pages.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/aide/${g.key}/${p.slug}`} className="flex h-full gap-4 rounded-2xl border border-line bg-white p-5 hover:border-brand-600">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display font-extrabold text-brand-800" aria-hidden>{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <strong className="text-lg">{p.title}</strong>
                  <span className="text-[15px] text-muted">{p.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
