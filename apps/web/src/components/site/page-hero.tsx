import { Eyebrow } from "@/components/ui/card";

/** En-tête des pages publiques ; `actions` sous le texte, `aside` (photo) à droite. */
export function PageHero({ eyebrow, title, children, actions, aside }: { eyebrow: string; title: string; children?: React.ReactNode; actions?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-4 py-14 sm:px-6">
        <div className="flex flex-[1_1_440px] flex-col gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="max-w-[20ch] text-4xl font-extrabold sm:text-5xl">{title}</h1>
          {children && <div className="max-w-[62ch] text-lg text-[#3a4740]">{children}</div>}
          {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        </div>
        {aside}
      </div>
    </section>
  );
}
