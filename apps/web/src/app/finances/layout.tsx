import { AppShell } from "@/components/site/app-shell";
import { requireFinances } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Espace Finances : le comptable n'a accès qu'à lui ; les dirigeants y viennent depuis leur espace (lecture seule sauf Trésorier et administrateur). */
export default async function FinancesLayout({ children }: { children: React.ReactNode }) {
  const v = await requireFinances();
  return (
    <AppShell
      dark
      space="Finances"
      userName={v.isComptable ? "Comptable" : `${v.member.firstNames} ${v.member.lastName.charAt(0)}.`}
      initials={(v.member.firstNames[0] ?? "") + (v.member.lastName[0] ?? "")}
      nav={[
        { href: "/finances", label: "Tableau de bord" },
        { href: "/finances/journal", label: "Journal comptable" },
        { href: "/finances/depenses", label: "Dépenses à viser" },
        { href: "/finances/encaisser", label: "Encaisser en espèces" },
        { href: "/finances/paiements", label: "Paiements et retards" },
      ]}
      extra={[...(v.isDirigeant ? [{ href: "/dirigeants", label: "Espace dirigeants" }] : []), { href: "/membre", label: "Mon espace membre" }]}
    >
      {!v.canRecord && (
        <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">
          Lecture seule : seuls le comptable, le Trésorier et l'administrateur enregistrent des opérations.{v.canApprove ? " Membre du CA : vous visez les dépenses dans « Dépenses à viser »." : ""}
        </p>
      )}
      {children}
    </AppShell>
  );
}
