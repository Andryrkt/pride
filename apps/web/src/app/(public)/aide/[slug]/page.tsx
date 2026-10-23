import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ag/print-button";
import { GuideArticle } from "@/components/site/guide-article";
import { GUIDE_MEMBRES } from "@/content/guide-membres";

export const generateStaticParams = () => GUIDE_MEMBRES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = GUIDE_MEMBRES.find((p) => p.slug === slug);
  return { title: page ? `Aide · ${page.title}` : "Aide" };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = GUIDE_MEMBRES.findIndex((p) => p.slug === slug);
  if (i < 0) notFound();
  const [prev, next] = [GUIDE_MEMBRES[i - 1], GUIDE_MEMBRES[i + 1]];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/aide" className="font-semibold text-brand-600">← Tout le guide</Link>
        <PrintButton label="Imprimer cette page" />
      </div>
      <GuideArticle page={GUIDE_MEMBRES[i]!} n={i + 1} />
      <nav aria-label="Pages du guide" className="flex flex-wrap justify-between gap-3 border-t border-line pt-6 print:hidden">
        {prev ? <Link href={`/aide/${prev.slug}`} className="font-semibold text-brand-600">← {prev.title}</Link> : <span />}
        {next && <Link href={`/aide/${next.slug}`} className="text-right font-semibold text-brand-600">{next.title} →</Link>}
      </nav>
    </div>
  );
}
