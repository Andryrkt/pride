import Link from "next/link";
import { desc, db, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { APPLICATION_STATUS as STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";


export default async function ApplicationsPage() {
  const apps = await db.query.applications.findMany({ orderBy: desc(schema.applications.createdAt), with: { sponsor: true } });
  return (
    <>
      <PageTitle title="Agrément des adhésions" sub="Règlement intérieur, art. 1 : agrément par le conseil d'administration à la majorité de ses membres présents." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-[14.5px]">
          <thead className="bg-paper text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Référence</th><th>Candidat</th><th>Déposée le</th><th>Parrainage</th><th>Étape</th></tr>
          </thead>
          <tbody>
            {apps.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-muted">Aucune candidature pour le moment.</td></tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="px-4 py-3"><Link href={`/dirigeants/adhesions/${a.id}`} className="font-semibold text-brand-600">{a.reference}</Link></td>
                <td>{a.lastName} {a.firstNames}{a.category === "ACTIF_MINEUR" ? " (mineur)" : ""}</td>
                <td>{formatDate(a.createdAt)}</td>
                <td>{a.sponsor ? `${a.sponsor.lastName} ${a.sponsor.firstNames}` : "Entretien demandé"}</td>
                <td><Badge tone={STATUS[a.status]![1]}>{STATUS[a.status]![0]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
