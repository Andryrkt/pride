import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { GUIDE_MEMBRES } from "@/content/guide-membres";

export const metadata = { title: "Aide · Guide des membres" };

export default function HelpPage() {
  return (
    <>
      <PageHero eyebrow="Aide" title="Guide des membres" actions={<ButtonLink href="/aide/imprimer" variant="outline">Imprimer tout le guide</ButtonLink>}>
        Comment utiliser votre espace membre, étape par étape. Une question sans réponse ? Écrivez à l'assistant de la messagerie, ou contactez l'association.
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-2">
          {GUIDE_MEMBRES.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/aide/${p.slug}`} className="flex h-full gap-4 rounded-2xl border border-line bg-white p-5 hover:border-brand-600">
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
