import { AppShell } from "@/components/site/app-shell";
import { requireFinances } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Espace Finances : le comptable n'a accès qu'à lui ; les dirigeants y viennent depuis leur espace (lecture seule sauf Trésorier). */
export default async function FinancesLayout({ children }: { children: React.ReactNode }) {
  const v = await requireFinances();
  return (
    <AppShell
      dark
      space="Finances"
      userName={v.isComptable ? "Comptable" : `${v.member.firstNames} ${v.member.lastName.charAt(0)}.`}
      initials={(v.member.firstNames[0] ?? "") + (v.member.lastName[0] ?? "")}
      photo={v.member.photoKey ? `/api/photo/${v.member.id}?v=${encodeURIComponent(v.member.photoKey)}` : null}
      nav={[
        { href: "/finances", label: "Tableau de bord" },
        { href: "/finances/journal", label: "Journal comptable" },
        { href: "/finances/livre", label: "Livre comptable" },
        { href: "/finances/budget", label: "Budget" },
        { href: "/finances/depenses", label: "Dépenses à viser" },
        { href: "/finances/verifier", label: "Paiements à vérifier" },
        { href: "/finances/encaisser", label: "Encaisser en espèces" },
        { href: "/finances/paiements", label: "Paiements et retards" },
        { href: "/finances/numeros", label: "Numéros mobile money" },
      ]}
      extra={[...(v.isDirigeant ? [{ href: "/dirigeants", label: "Espace dirigeants" }] : []), { href: "/membre", label: "Mon espace membre" }]}
    >
      {v.actingTreasurer && <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">Poste de Trésorier vacant : vous le remplacez temporairement, jusqu'à la désignation d'un Trésorier.</p>}
      {!v.canRecord && (
        <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">
          Lecture seule : seuls le comptable et le Trésorier enregistrent des opérations.{v.canApprove ? " Membre du CA : vous visez les dépenses dans « Dépenses à viser »." : ""}
        </p>
      )}
      {children}
    </AppShell>
  );
}
