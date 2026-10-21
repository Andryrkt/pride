import { CheckCircle2, XCircle } from "lucide-react";
import { db, eq, schema } from "@pride/db";
import { TARIFS, type MemberCategory } from "@pride/shared";
import { Card } from "@/components/ui/card";
import { ensureDues, listDues } from "@/lib/dues";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vérification d'une carte de membre", robots: { index: false, follow: false } };

/** Page ouverte en scannant le QR de la carte : elle dit seulement si la carte est valide, sans autre donnée personnelle. */
export default async function VerifyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, id) });
  const valid = member?.status === "ACTIF";
  let upToDate = false;
  if (member && valid) {
    await ensureDues(member);
    upToDate = (await listDues(member.id)).every((d) => d.status === "PAYEE");
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold">Vérification d'une carte de membre</h1>
      <Card className={`flex flex-col gap-4 border-2 ${valid ? "border-brand-600" : "border-flame-600"}`}>
        <div className="flex items-center gap-3">
          {valid ? <CheckCircle2 size={40} className="shrink-0 text-brand-600" aria-hidden /> : <XCircle size={40} className="shrink-0 text-flame-600" aria-hidden />}
          <strong className={`text-2xl ${valid ? "text-brand-800" : "text-flame-800"}`}>{valid ? "Carte valide" : "Carte non valide"}</strong>
        </div>
        {member && valid && member.photoKey && (
          // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API, non optimisable par next/image
          <img src={`/api/photo/${member.id}?v=${encodeURIComponent(member.photoKey)}`} alt={`Photo de ${member.firstNames} ${member.lastName}`} className="h-40 w-30 self-center rounded-xl object-cover" />
        )}
        {member && valid ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-muted">Membre</dt>
            <dd className="font-semibold">{member.lastName} {member.firstNames}</dd>
            <dt className="text-muted">Numéro</dt>
            <dd>{member.number}</dd>
            <dt className="text-muted">Catégorie</dt>
            <dd>{TARIFS[member.category as MemberCategory].label}</dd>
            <dt className="text-muted">Cotisations</dt>
            <dd className={upToDate ? "text-brand-800" : "text-sun-800"}>{upToDate ? "À jour" : "Non à jour"}</dd>
          </dl>
        ) : (
          <p className="text-[15px]">Cette carte ne correspond à aucun membre actif de l'association PRIDe.</p>
        )}
      </Card>
      <p className="text-sm text-muted">En cas de doute, contactez l'association au 032 67 288 62.</p>
    </section>
  );
}
