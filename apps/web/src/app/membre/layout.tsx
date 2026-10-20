import { AppShell } from "@/components/site/app-shell";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const v = await requireMember();
  const m = v.member;
  return (
    <AppShell
      space="Espace membres"
      userName={`${m.firstNames} ${m.lastName.charAt(0)}.`}
      initials={(m.firstNames[0] ?? "") + (m.lastName[0] ?? "")}
      nav={[
        { href: "/membre", label: "Tableau de bord" },
        { href: "/membre/actualites", label: "Actualités" },
        { href: "/membre/ag", label: "Assemblées générales" },
        { href: "/membre/cotisations", label: "Mes cotisations" },
        { href: "/membre/profil", label: "Mon profil" },
      ]}
      extra={v.isDirigeant ? [{ href: "/dirigeants", label: "Espace dirigeants" }] : undefined}
    >
      {children}
    </AppShell>
  );
}
