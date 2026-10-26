import Link from "next/link";
import { BookOpen, CircleHelp, ShieldCheck, UserPlus } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { GUIDES } from "@/content/guides";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Aide" };

const ICONS = { candidats: UserPlus, membres: BookOpen, dirigeants: ShieldCheck };

export default async function HelpHome() {
  const viewer = await getViewer();
  // Le guide des dirigeants n'apparaît qu'aux dirigeants connectés.
  const guides = (Object.keys(GUIDES) as (keyof typeof GUIDES)[]).filter((k) => !GUIDES[k].dirigeants || viewer?.isDirigeant);
  return (
    <>
      <PageHero eyebrow="Aide" title="Guides d'utilisation">
        Comment utiliser le site de PRIDe, étape par étape. Une question sans réponse ? Consultez les questions fréquentes, écrivez à l'assistant de la messagerie ou contactez l'association.
      </PageHero>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {guides.map((k) => {
          const Icon = ICONS[k];
          return (
            <Link key={k} href={`/aide/${k}`} className="flex gap-4 rounded-2xl border border-line bg-white p-6 hover:border-brand-600">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800"><Icon size={24} aria-hidden /></span>
              <span className="flex flex-col gap-1">
                <strong className="text-xl">{GUIDES[k].title}</strong>
                <span className="text-muted">{GUIDES[k].intro}</span>
                <span className="text-sm font-semibold text-brand-600">{GUIDES[k].pages.length} pages</span>
              </span>
            </Link>
          );
        })}
        <Link href="/aide/questions" className="flex gap-4 rounded-2xl border border-line bg-white p-6 hover:border-brand-600">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sun-50 text-sun-800"><CircleHelp size={24} aria-hidden /></span>
          <span className="flex flex-col gap-1">
            <strong className="text-xl">Questions fréquentes</strong>
            <span className="text-muted">Adhésion, connexion, cotisations, carte, données personnelles : les réponses courtes.</span>
          </span>
        </Link>
      </section>
    </>
  );
}
