import Link from "next/link";
import { FileText, PlayCircle } from "lucide-react";
import { RESOURCE_THEMES, youtubeId, type ResourceTheme } from "@pride/shared";
import { Badge, Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { YoutubeVideo } from "./video";

type Resource = {
  id: string;
  theme: string;
  title: string;
  summary: string;
  body: string;
  videoUrl: string | null;
  fileKey: string | null;
  fileName: string | null;
  visibility: "PUBLIC" | "MEMBRES";
  publishedAt: Date;
  author: { firstNames: string; lastName: string };
};

const themeLabel = (t: string) => RESOURCE_THEMES[t as ResourceTheme] ?? t;

/** Onglets de l'espace « Apprendre » (une seule entrée dans le menu). */
export function LearnTabs({ current }: { current: "formations" | "ressources" | "pratiques" }) {
  const tabs = [
    { key: "formations", href: "/membre/formations", label: "Formations et offres" },
    { key: "ressources", href: "/membre/ressources", label: "Ressources" },
    { key: "pratiques", href: "/membre/discipline", label: "Mes pratiques" },
  ] as const;
  return (
    <nav aria-label="Apprendre" className="flex flex-wrap gap-1 rounded-2xl bg-[#e9eee8] p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cn("flex-1 rounded-xl px-4 py-2.5 text-center font-semibold whitespace-nowrap", t.key === current ? "bg-white text-brand-800 shadow-sm" : "text-[#2b3832] hover:bg-white/60")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Sous-onglets de « Mes pratiques » : outils personnels, visibles du membre seul. */
export function PracticeTabs({ current }: { current: "discipline" | "budget" }) {
  const item = (key: "discipline" | "budget", href: string, label: string) => (
    <Link href={href} aria-current={key === current ? "page" : undefined} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", key === current ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:bg-[#e9eee8]")}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Mes pratiques" className="flex flex-wrap gap-2">
      {item("discipline", "/membre/discipline", "Autodiscipline")}
      {item("budget", "/membre/mon-budget", "Mon budget")}
    </nav>
  );
}

/** Filtre par thème (liens, sans JavaScript). */
export function ThemeFilter({ base, current }: { base: string; current?: string }) {
  const item = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:bg-[#e9eee8]")}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {item(base, "Tous les thèmes", !current)}
      {(Object.keys(RESOURCE_THEMES) as ResourceTheme[]).map((k) => item(`${base}?theme=${k}`, RESOURCE_THEMES[k], current === k))}
    </div>
  );
}

export function ResourceCard({ r, href }: { r: Resource; href: string }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{themeLabel(r.theme)}</Badge>
        {r.visibility === "PUBLIC" && <Badge tone="yellow">Vitrine publique</Badge>}
      </div>
      <h2 className="text-[19px] font-bold"><Link href={href} className="hover:underline">{r.title}</Link></h2>
      <p className="text-[15px] text-muted">{r.summary}</p>
      <div className="mt-auto flex flex-wrap gap-4 pt-1 text-sm font-semibold text-brand-800">
        {r.videoUrl && <span className="flex items-center gap-1.5"><PlayCircle className="size-4" aria-hidden />Vidéo</span>}
        {r.fileKey && <span className="flex items-center gap-1.5"><FileText className="size-4" aria-hidden />PDF</span>}
      </div>
    </Card>
  );
}

/** Contenu complet d'une ressource : texte, vidéo (au clic), PDF. */
export function ResourceBody({ r }: { r: Resource }) {
  const video = r.videoUrl ? youtubeId(r.videoUrl) : null;
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge>{themeLabel(r.theme)}</Badge>
        {r.visibility === "PUBLIC" ? <Badge tone="yellow">Vitrine publique</Badge> : <Badge tone="gray">Réservée aux membres</Badge>}
        <span>Publiée le {formatDate(r.publishedAt)} par {r.author.firstNames} {r.author.lastName}</span>
      </div>
      <p className="text-[17px] font-semibold">{r.summary}</p>
      {video && <YoutubeVideo id={video} title={r.title} />}
      <div className="text-[16px] leading-relaxed whitespace-pre-line">{r.body}</div>
      {r.fileKey && (
        <a href={`/api/ressources/${r.id}`} target="_blank" rel="noopener" className="flex items-center gap-3 self-start rounded-xl border border-line bg-paper px-4 py-3 font-semibold text-brand-800 hover:bg-[#e9eee8]">
          <FileText className="size-5" aria-hidden />
          Télécharger le PDF{r.fileName ? ` (${r.fileName})` : ""}
        </a>
      )}
    </Card>
  );
}
