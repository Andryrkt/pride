import Link from "next/link";
import { desc, db, schema } from "@pride/db";
import { formatAriary, TARIFS, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { dueLabel, ensureDues, listDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function MemberDashboard() {
  const { member } = await requireMember();
  await ensureDues(member);
  const [dues, posts] = await Promise.all([
    listDues(member.id),
    db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt), limit: 4 }),
  ]);
  const unpaid = dues.filter((d) => d.status === "A_PAYER");
  const lastPaid = [...dues].reverse().find((d) => d.status === "PAYEE" && d.kind === "COTISATION");
  const total = unpaid.reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <PageTitle title={`Bonjour ${member.firstNames.split(" ")[0]}`} sub={`${TARIFS[member.category as MemberCategory].label} depuis le ${formatDate(member.joinedAt)}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-3xl bg-brand-800 p-6 text-brand-100">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-extrabold text-white">PRI<span className="text-[#ff8a7a]">De</span></span>
            <span className="text-[11px] font-bold tracking-[0.14em]">CARTE DE MEMBRE</span>
          </div>
          <div>
            <div className="font-display text-2xl font-extrabold text-white">{member.lastName} {member.firstNames}</div>
            <div className="text-sm">N° {member.number} · {TARIFS[member.category as MemberCategory].label}</div>
            <div className="text-sm">{lastPaid ? `Cotisations réglées jusqu'à ${dueLabel(lastPaid).replace("Cotisation ", "")}` : "Aucune cotisation réglée"}</div>
          </div>
        </div>
        <Card className={unpaid.length ? "flex flex-col justify-between gap-4 border-[#f1c9c3] bg-[#fff7f5]" : "flex flex-col justify-between gap-4"}>
          <div>
            <Eyebrow className="text-muted">Cotisations</Eyebrow>
            <div className="mt-1 font-display text-3xl font-extrabold">{unpaid.length ? `${formatAriary(total)} à payer` : "À jour"}</div>
            {unpaid.length > 0 && <p className="text-muted">{unpaid.map(dueLabel).join(", ")}</p>}
          </div>
          <ButtonLink href="/membre/cotisations" className="self-start" variant={unpaid.length ? "primary" : "outline"}>
            {unpaid.length ? "Payer" : "Voir l'historique"}
          </ButtonLink>
        </Card>
      </div>
      <Card>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Dernières actualités</h2>
          <Link href="/membre/actualites" className="text-sm font-semibold text-brand-600">Tout voir</Link>
        </div>
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-muted">{p.type === "EVENEMENT" ? "Agenda" : p.type === "ANNONCE" ? "Annonce" : "Article"} · {formatDate(p.publishedAt)}</div>
              </div>
              <Badge tone={p.visibility === "MEMBRES" ? "dark" : "green"}>{p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
