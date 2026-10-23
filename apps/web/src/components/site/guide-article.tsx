import Image from "next/image";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { GuidePage } from "@/content/guide-membres";

/** Une page du guide : étapes numérotées (avec capture d'écran), conseils, liens vers l'application. */
export function GuideArticle({ page, n, newSheet }: { page: GuidePage; n: number; newSheet?: boolean }) {
  return (
    <article className={newSheet ? "flex flex-col gap-6 break-before-page" : "flex flex-col gap-6"}>
      <header className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-[0.14em] text-brand-600 uppercase">Guide des membres · {n}</span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{page.title}</h1>
        <p className="text-lg text-[#3a4740]">{page.summary}</p>
      </header>
      <ol className="flex flex-col gap-5">
        {page.steps.map((s, i) => (
          <li key={i} className="flex break-inside-avoid gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display font-extrabold text-white" aria-hidden>{i + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
              <p className="text-[17px]">{s.text}</p>
              {s.image && (
                <Image
                  src={`/aide/membres/${s.image}`}
                  alt={`Capture d'écran : ${s.text}`}
                  width={1280}
                  height={800}
                  className="h-auto w-full max-w-3xl rounded-xl border border-line shadow-sm print:max-w-[11cm]"
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      {page.tips && page.tips.length > 0 && (
        <aside className="flex break-inside-avoid flex-col gap-2 rounded-2xl bg-sun-50 p-5 text-sun-800">
          <strong className="flex items-center gap-2"><Lightbulb size={18} aria-hidden /> Bon à savoir</strong>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15.5px]">
            {page.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </aside>
      )}
      {page.links && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {page.links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 font-semibold text-white hover:bg-brand-800">
              Ouvrir : {l.label}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
