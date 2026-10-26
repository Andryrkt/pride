import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { FAQ } from "@/content/faq";

export const metadata = { title: "Aide · Questions fréquentes" };

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Aide" title="Questions fréquentes" actions={<ButtonLink href="/aide" variant="ghost">Tous les guides</ButtonLink>}>
        Les réponses courtes aux questions que l'on nous pose le plus souvent.
      </PageHero>
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
        {FAQ.map((group) => (
          <section key={group.theme} className="flex flex-col gap-3">
            <h2 className="text-2xl font-extrabold">{group.theme}</h2>
            {group.items.map((item) => (
              // <details> : la réponse s'ouvre au clic, sans script.
              <details key={item.q} className="group break-inside-avoid rounded-2xl border border-line bg-white px-5 py-4 open:border-brand-600 print:border-0 print:p-0">
                <summary className="cursor-pointer list-none font-semibold text-[17px] marker:hidden">
                  <span className="mr-2 inline-block text-brand-600 transition-transform group-open:rotate-90" aria-hidden>›</span>
                  {item.q}
                </summary>
                <div className="mt-2 flex flex-col gap-2 pl-5 text-[15.5px] text-[#2b3832]">
                  <p>{item.a}</p>
                  {item.link && (
                    <Link href={item.link.href} className="self-start font-semibold text-brand-600 hover:underline print:hidden">{item.link.label} →</Link>
                  )}
                </div>
              </details>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
