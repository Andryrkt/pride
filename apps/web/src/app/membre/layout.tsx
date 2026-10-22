import { count, db, gte, schema } from "@pride/db";
import { AppShell } from "@/components/site/app-shell";
import { requireMember } from "@/lib/session";
import { newPostsSince } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const v = await requireMember();
  const m = v.member;
  const [{ news }] = await db.select({ news: count() }).from(schema.posts).where(gte(schema.posts.publishedAt, newPostsSince()));
  return (
    <AppShell
      space="Espace membres"
      userName={`${m.firstNames} ${m.lastName.charAt(0)}.`}
      initials={(m.firstNames[0] ?? "") + (m.lastName[0] ?? "")}
      nav={[
        { href: "/membre", label: "Tableau de bord" },
        { href: "/membre/actualites", label: "Actualités", badge: news },
        { href: "/membre/cotisations", label: "Mes cotisations" },
        { href: "/membre/formations", label: "Formations et offres" },
        { href: "/membre/competences", label: "Compétences et commissions" },
        { href: "/membre/ag", label: "Assemblée générale" },
        { href: "/membre/profil", label: "Mon profil" },
      ]}
      extra={v.isDirigeant ? [{ href: "/dirigeants", label: "Espace dirigeants" }] : undefined}
    >
      {children}
    </AppShell>
  );
}
