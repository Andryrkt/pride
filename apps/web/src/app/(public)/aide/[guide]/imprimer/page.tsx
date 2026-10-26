import Link from "next/link";
import { PrintButton } from "@/components/ag/print-button";
import { GuideArticle } from "@/components/site/guide-article";
import { GUIDES, isGuide } from "@/content/guides";
import { guideFor } from "@/lib/help";

export async function generateMetadata({ params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params;
  return { title: isGuide(guide) ? `${GUIDES[guide].title} (version à imprimer)` : "Aide" };
}

/** Tout un guide sur une page : une partie par feuille à l'impression. */
export default async function PrintGuidePage({ params }: { params: Promise<{ guide: string }> }) {
  const g = await guideFor((await params).guide);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-14 px-4 py-10 sm:px-6 print:gap-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/aide/${g.key}`} className="font-semibold text-brand-600">← Retour au guide</Link>
        <PrintButton label="Imprimer ou enregistrer en PDF" />
      </div>
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold">PRIDe · {g.title}</h1>
        <p className="text-lg text-[#3a4740]">{g.intro}</p>
        <ol className="flex list-decimal flex-col gap-1 pl-9 text-lg">
          {g.pages.map((p) => <li key={p.slug}>{p.title}</li>)}
        </ol>
      </header>
      {g.pages.map((p, i) => (
        <GuideArticle key={p.slug} guide={g.key} label={g.title} page={p} n={i + 1} newSheet />
      ))}
    </div>
  );
}
