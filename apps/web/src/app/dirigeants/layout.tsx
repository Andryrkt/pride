import { and, count, db, eq, inArray, ne, schema } from "@pride/db";
import { ROLE_LABELS } from "@pride/shared";
import { AppShell } from "@/components/site/app-shell";
import { unreadForStaff } from "@/lib/messaging";
import { requireDirigeant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DirigeantsLayout({ children }: { children: React.ReactNode }) {
  const v = await requireDirigeant();
  const [[{ n }], [{ aids }], [{ offers }], [{ joins }], convs] = await Promise.all([
    db.select({ n: count() }).from(schema.applications).where(inArray(schema.applications.status, ["SOUMISE", "ENTRETIEN", "VOTE_CA", "AGREEE"])),
    db.select({ aids: count() }).from(schema.solidarityRequests).where(eq(schema.solidarityRequests.status, "DEMANDEE")),
    db.select({ offers: count() }).from(schema.offers).where(eq(schema.offers.status, "PROPOSEE")),
    db.select({ joins: count() }).from(schema.commissionRequests).where(eq(schema.commissionRequests.status, "DEMANDEE")),
    db.query.conversations.findMany({ where: and(ne(schema.conversations.recipient, "ASSISTANT"), eq(schema.conversations.lastSender, "MEMBRE")) }),
  ]);
  return (
    <AppShell
      dark
      space="Espace dirigeants"
      userName={ROLE_LABELS[v.roles[0]!]}
      initials={(v.member.firstNames[0] ?? "") + (v.member.lastName[0] ?? "")}
      nav={[
        { href: "/dirigeants", label: "Tableau de bord" },
        { href: "/dirigeants/adhesions", label: "Agrément des adhésions", badge: n },
        { href: "/dirigeants/membres", label: "Registre des membres" },
        { href: "/dirigeants/commissions", label: "Commissions", badge: joins },
        { href: "/dirigeants/solidarite", label: "Solidarité", badge: aids },
        { href: "/dirigeants/offres", label: "Offres des membres", badge: offers },
        { href: "/dirigeants/messages", label: "Messagerie", badge: convs.filter(unreadForStaff).length },
        { href: "/dirigeants/ag", label: "Assemblées générales" },
        { href: "/dirigeants/actualites", label: "Actualités et événements" },
      ]}
      extra={[{ href: "/finances", label: "Finances" }, { href: "/membre", label: "Mon espace membre" }]}
    >
      {children}
    </AppShell>
  );
}
