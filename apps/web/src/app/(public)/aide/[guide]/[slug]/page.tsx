import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ag/print-button";
import { GuideArticle } from "@/components/site/guide-article";
import { GUIDES, isGuide } from "@/content/guides";
import { guideFor } from "@/lib/help";

export async function generateMetadata({ params }: { params: Promise<{ guide: string; slug: string }> }) {
  const { guide, slug } = await params;
  const page = isGuide(guide) ? GUIDES[guide].pages.find((p) => p.slug === slug) : undefined;
  return { title: page ? `Aide · ${page.title}` : "Aide" };
}

export default async function GuideArticlePage({ params }: { params: Promise<{ guide: string; slug: string }> }) {
  const { guide, slug } = await params;
  const g = await guideFor(guide);
  const i = g.pages.findIndex((p) => p.slug === slug);
  if (i < 0) notFound();
  const [prev, next] = [g.pages[i - 1], g.pages[i + 1]];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/aide/${g.key}`} className="font-semibold text-brand-600">← {g.title}</Link>
        <PrintButton label="Imprimer cette page" />
      </div>
      <GuideArticle guide={g.key} label={g.title} page={g.pages[i]!} n={i + 1} />
      <nav aria-label="Pages du guide" className="flex flex-wrap justify-between gap-3 border-t border-line pt-6 print:hidden">
        {prev ? <Link href={`/aide/${g.key}/${prev.slug}`} className="font-semibold text-brand-600">← {prev.title}</Link> : <span />}
        {next && <Link href={`/aide/${g.key}/${next.slug}`} className="text-right font-semibold text-brand-600">{next.title} →</Link>}
      </nav>
    </div>
  );
}
