import Link from "next/link";
import { PrintButton } from "@/components/ag/print-button";
import { GuideArticle } from "@/components/site/guide-article";
import { GUIDE_MEMBRES } from "@/content/guide-membres";

export const metadata = { title: "Guide des membres (version à imprimer)" };

/** Tout le guide sur une page : une partie par feuille à l'impression. */
export default function PrintGuidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-14 px-4 py-10 sm:px-6 print:gap-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/aide" className="font-semibold text-brand-600">← Retour au guide</Link>
        <PrintButton label="Imprimer ou enregistrer en PDF" />
      </div>
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold">PRIDe · Guide des membres</h1>
        <ol className="flex list-decimal flex-col gap-1 pl-9 text-lg">
          {GUIDE_MEMBRES.map((p) => <li key={p.slug}>{p.title}</li>)}
        </ol>
      </header>
      {GUIDE_MEMBRES.map((p, i) => (
        <GuideArticle key={p.slug} page={p} n={i + 1} newSheet />
      ))}
    </div>
  );
}
