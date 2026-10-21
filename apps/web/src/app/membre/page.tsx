import Image from "next/image";
import Link from "next/link";
import { asc, desc, db, eq, gte, and, inArray, schema } from "@pride/db";
import { formatAriary, periodLabel, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS, TARIFS, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { KIND_LABELS } from "@/lib/assemblies";
import { dueLabel, ensureDues, listDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { SOLIDARITY_STATUS } from "@/lib/solidarity";
import { formatDate, formatDateTime, newPostsSince } from "@/lib/utils";
import { SolidarityCard } from "./solidarity-card";

const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/** Dernier jour du mois d'une période « 2026-10 ». */
function endOfPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y!, m!, 0);
}

export default async function MemberDashboard() {
  const { member } = await requireMember();
  await ensureDues(member);
  const now = new Date();
  const [dues, posts, nextEvent, nextAg, aids] = await Promise.all([
    listDues(member.id),
    db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt), limit: 4 }),
    db.query.posts.findFirst({ where: and(eq(schema.posts.type, "EVENEMENT"), gte(schema.posts.eventAt, now)), orderBy: asc(schema.posts.eventAt) }),
    db.query.assemblies.findFirst({ where: inArray(schema.assemblies.status, ["CONVOQUEE", "EN_SEANCE"]), orderBy: asc(schema.assemblies.scheduledAt) }),
    db.query.solidarityRequests.findMany({ where: eq(schema.solidarityRequests.memberId, member.id), orderBy: desc(schema.solidarityRequests.createdAt), limit: 5 }),
  ]);
  const unpaid = dues.filter((d) => d.status === "A_PAYER");
  const lastPaid = [...dues].reverse().find((d) => d.status === "PAYEE" && d.kind === "COTISATION");
  const total = unpaid.reduce((s, d) => s + d.amount, 0);
  const category = TARIFS[member.category as MemberCategory].label;
  const isNew = (d: Date) => d >= newPostsSince();

  return (
    <>
      <PageTitle
        title={`Bonjour ${member.firstNames.split(" ")[0]}`}
        sub={[`${category} depuis ${monthYear.format(new Date(member.joinedAt))}`, member.address].filter(Boolean).join(" · ")}
      />
      <div className="flex flex-wrap gap-5">
        <div className="flex flex-[1_1_340px] flex-col justify-between gap-5 rounded-[20px] bg-brand-800 p-6 text-brand-100">
          <div className="flex items-center justify-between gap-3">
            <Image src="/images/logo-blanc.png" alt="PRIDe" width={34} height={48} className="h-12 w-auto" />
            <span className="text-[11px] font-bold tracking-[0.14em]">CARTE DE MEMBRE</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-[22px] font-extrabold text-white">{member.lastName} {member.firstNames}</span>
            <span className="text-sm">N° {member.number} · {category}</span>
            <span className="text-sm">{lastPaid ? `Cotisations à jour jusqu'à ${periodLabel(lastPaid.period)}` : "Aucune cotisation réglée"}</span>
          </div>
        </div>

        <div className="grid flex-[1_1_340px] gap-3.5">
          {unpaid.length ? (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-[#f1c9c3] bg-[#fff7f5] p-[22px]">
              <div>
                <Eyebrow>{unpaid.length === 1 ? dueLabel(unpaid[0]!) : `${unpaid.length} échéances`}</Eyebrow>
                <div className="text-xl font-bold">{formatAriary(total)} à payer</div>
                <div className="text-sm text-muted">
                  {unpaid.length === 1 ? `avant le ${formatDate(endOfPeriod(unpaid[0]!.period))}` : unpaid.map(dueLabel).join(", ")}
                </div>
              </div>
              <ButtonLink href="/membre/cotisations">Payer</ButtonLink>
            </Card>
          ) : (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-[22px]">
              <div>
                <Eyebrow>Cotisations</Eyebrow>
                <div className="text-xl font-bold">À jour</div>
              </div>
              <ButtonLink href="/membre/cotisations" variant="outline">Historique</ButtonLink>
            </Card>
          )}
          {nextEvent && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-[22px]">
              <div className="min-w-0">
                <Eyebrow>Prochain événement</Eyebrow>
                <div className="text-[17px] font-bold">{nextEvent.title}</div>
                <div className="text-sm text-muted">{formatDateTime(nextEvent.eventAt)}{nextEvent.location ? ` · ${nextEvent.location}` : ""}</div>
              </div>
              <ButtonLink href="/membre/actualites" variant="outline">Voir</ButtonLink>
            </Card>
          )}
          {nextAg && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-[22px]">
              <div className="min-w-0">
                <Eyebrow>Assemblée générale</Eyebrow>
                <div className="text-[17px] font-bold">{nextAg.status === "EN_SEANCE" ? "Séance en cours" : KIND_LABELS[nextAg.kind]}</div>
                <div className="text-sm text-muted">{formatDateTime(nextAg.scheduledAt)} · {nextAg.location}</div>
              </div>
              <ButtonLink href={`/membre/ag/${nextAg.id}`} variant="outline">Voir</ButtonLink>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-[22px]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold">Dernières actualités</h2>
          <Link href="/membre/actualites" className="text-sm font-semibold text-brand-600">Tout voir</Link>
        </div>
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-muted">
                  {p.type === "EVENEMENT" ? "Agenda" : p.type === "ANNONCE" ? "Annonce" : "Article"} · {p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}
                </div>
              </div>
              {isNew(p.publishedAt) && <Badge tone="red">Nouveau</Badge>}
            </li>
          ))}
        </ul>
      </Card>

      <SolidarityCard
        requests={aids.map((r) => ({
          id: r.id,
          label: `${SOLIDARITE_EVENEMENTS[r.kind]} · ${SOLIDARITE_CONCERNE[r.concerns]}`,
          date: formatDate(r.eventDate),
          amount: r.amount,
          status: SOLIDARITY_STATUS[r.status][0],
          tone: SOLIDARITY_STATUS[r.status][1],
        }))}
      />
    </>
  );
}
