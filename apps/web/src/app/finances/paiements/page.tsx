import Link from "next/link";
import { formatAriary, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { lateMembers, recentPayments } from "@/lib/finances";
import { requireFinances } from "@/lib/session";
import { formatDate } from "@/lib/utils";

const STATUS = { REUSSI: ["Réussi", "green"], EN_ATTENTE: ["En attente", "yellow"], ECHOUE: ["Échoué", "red"] } as const;

export default async function PaymentsPage() {
  await requireFinances();
  const [payments, late] = await Promise.all([recentPayments(), lateMembers()]);
  return (
    <>
      <PageTitle title="Paiements et retards" sub="Les 100 derniers paiements de cotisations, et les membres qui ont au moins un mois impayé." />

      <Card id="retards" className="scroll-mt-4 overflow-x-auto p-0">
        <h2 className="px-6 pt-5 pb-2 text-xl font-bold">Membres en retard ({late.length})</h2>
        <table className="w-full min-w-170 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Membre</th><th>N°</th><th>Téléphone</th><th>Mois impayés</th><th>Montant</th><th className="px-4" /></tr>
          </thead>
          <tbody>
            {late.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-muted">Aucun membre en retard.</td></tr>}
            {late.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{m.lastName} {m.firstNames}</td>
                <td className="font-mono text-sm">{m.number}</td>
                <td>{m.phone ? <a href={`tel:${m.phone}`} className="text-brand-600">{m.phone}</a> : "—"}</td>
                <td>{m.months}</td>
                <td className="font-semibold">{formatAriary(Number(m.total))}</td>
                <td className="px-4"><Link href={`/finances/encaisser?membre=${m.id}`} className="font-semibold text-brand-600">Encaisser</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-6 pt-5 pb-2 text-xl font-bold">Derniers paiements</h2>
        <table className="w-full min-w-170 text-left text-[14.5px]">
          <thead className="bg-paper text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Date</th><th>Membre</th><th>Moyen</th><th>Montant</th><th>Statut</th><th>Reçu</th></tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-muted">Aucun paiement pour le moment.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                <td>{p.member.lastName} {p.member.firstNames}</td>
                <td>{PAYMENT_PROVIDERS[p.provider as PaymentProviderId] ?? "Espèces"}</td>
                <td>{formatAriary(p.amount)}</td>
                <td><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></td>
                <td className="font-mono text-sm">{p.receiptNumber ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
