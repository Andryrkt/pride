import { desc, db, eq, schema } from "@pride/db";
import { formatAriary, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { dueLabel, ensureDues, listDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { PayForm } from "./pay-form";

export default async function CotisationsPage({ searchParams }: { searchParams: Promise<{ recu?: string; attente?: string }> }) {
  const sp = await searchParams;
  const { member } = await requireMember();
  await ensureDues(member);
  const [dues, payments] = await Promise.all([
    listDues(member.id),
    db.query.payments.findMany({ where: eq(schema.payments.memberId, member.id), orderBy: desc(schema.payments.createdAt) }),
  ]);
  const unpaid = dues.filter((d) => d.status === "A_PAYER");
  const paidThisYear = dues.filter((d) => d.status === "PAYEE" && d.period.startsWith(String(new Date().getFullYear()))).reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <PageTitle title="Mes cotisations" sub="La cotisation versée reste acquise à l'association (règlement intérieur, art. 2)." />
      {sp.recu && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">Paiement reçu. Reçu n° {sp.recu}, à retrouver dans « Paiements et reçus ».</p>}
      {sp.attente && <p role="status" className="rounded-xl bg-sun-50 px-4 py-3 font-semibold text-sun-800">Demande envoyée : validez le paiement sur votre téléphone.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><div className="text-xs font-bold uppercase tracking-wider text-muted">Payé cette année</div><div className="font-display text-3xl font-extrabold">{formatAriary(paidThisYear)}</div></Card>
        <Card><div className="text-xs font-bold uppercase tracking-wider text-muted">Reste à payer</div><div className={`font-display text-3xl font-extrabold ${unpaid.length ? "text-flame-600" : ""}`}>{formatAriary(unpaid.reduce((s, d) => s + d.amount, 0))}</div></Card>
      </div>
      {unpaid.length > 0 && (
        <Card>
          <h2 className="mb-4 text-2xl font-bold">Payer par mobile money</h2>
          <PayForm dues={unpaid.map((d) => ({ id: d.id, label: dueLabel(d), amount: d.amount }))} defaultPhone={member.phone ?? ""} />
        </Card>
      )}
      <Card>
        <h2 className="mb-3 text-2xl font-bold">Échéances</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {dues.map((d) => (
            <div key={d.id} className={`flex flex-col gap-0.5 rounded-xl p-3 text-sm font-semibold ${d.status === "PAYEE" ? "bg-brand-50 text-brand-800" : "bg-flame-50 text-flame-800 ring-2 ring-flame-600"}`}>
              <span className="text-[15px]">{dueLabel(d)}</span>
              <span>{formatAriary(d.amount)} · {d.status === "PAYEE" ? "Payée" : "À payer"}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 text-2xl font-bold">Paiements et reçus</h2>
        {payments.length === 0 ? (
          <p className="text-muted">Aucun paiement en ligne pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[14.5px]">
              <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="py-2">Date</th><th>Moyen</th><th>Montant</th><th>Statut</th><th>Reçu</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-3">{formatDate(p.createdAt)}</td>
                    <td>{PAYMENT_PROVIDERS[p.provider as PaymentProviderId] ?? "Espèces"}</td>
                    <td>{formatAriary(p.amount)}</td>
                    <td><Badge tone={p.status === "REUSSI" ? "green" : p.status === "ECHOUE" ? "red" : "yellow"}>{p.status === "REUSSI" ? "Réussi" : p.status === "ECHOUE" ? "Échoué" : "En attente"}</Badge></td>
                    <td>{p.receiptNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
