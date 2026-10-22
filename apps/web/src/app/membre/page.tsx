import Image from "next/image";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { asc, desc, db, eq, gte, and, inArray, schema } from "@pride/db";
import { formatAriary, OFFER_TYPES, periodLabel, SOLIDARITE_CONCERNE, SOLIDARITE_EVENEMENTS, TARIFS, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { KIND_LABELS } from "@/lib/assemblies";
import { cardQrSvg } from "@/lib/card";
import { dueLabel, ensureDues, listDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { SOLIDARITY_STATUS } from "@/lib/solidarity";
import { cn, formatDate, formatDateTime, newPostsSince } from "@/lib/utils";
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
  const [dues, posts, nextTraining, nextEvent, nextAg, aids, offers] = await Promise.all([
    listDues(member.id),
    db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt), limit: 3 }),
    db.query.posts.findFirst({ where: and(eq(schema.posts.type, "FORMATION"), gte(schema.posts.eventAt, now)), orderBy: asc(schema.posts.eventAt) }),
    db.query.posts.findFirst({ where: and(eq(schema.posts.type, "EVENEMENT"), gte(schema.posts.eventAt, now)), orderBy: asc(schema.posts.eventAt) }),
    db.query.assemblies.findFirst({ where: inArray(schema.assemblies.status, ["CONVOQUEE", "EN_SEANCE"]), orderBy: asc(schema.assemblies.scheduledAt) }),
    db.query.solidarityRequests.findMany({ where: eq(schema.solidarityRequests.memberId, member.id), orderBy: desc(schema.solidarityRequests.createdAt), limit: 5 }),
    db.query.offers.findMany({ where: eq(schema.offers.status, "PUBLIEE"), orderBy: desc(schema.offers.createdAt), limit: 3 }),
  ]);
  // Comme la maquette : la prochaine formation en priorité, sinon le prochain événement.
  const next = nextTraining ?? nextEvent;
  const unpaid = dues.filter((d) => d.status === "A_PAYER");
  const lastPaid = [...dues].reverse().find((d) => d.status === "PAYEE" && d.kind === "COTISATION");
  const total = unpaid.reduce((s, d) => s + d.amount, 0);
  const category = TARIFS[member.category as MemberCategory].label;
  const isNew = (d: Date) => d >= newPostsSince();
  const qr = await cardQrSvg(member.id);

  return (
    <>
      <PageTitle
        title={`Bonjour ${member.firstNames.split(" ")[0]}`}
        sub={[`${category} depuis ${monthYear.format(new Date(member.joinedAt))}`, member.address].filter(Boolean).join(" · ")}
      />
      <div className="flex flex-wrap gap-5">
        <div className="flex w-full flex-col items-center gap-3 sm:w-75 sm:shrink-0">
          {/* Carte verticale, aux proportions de la carte imprimée (54 × 85,6 mm) */}
          <div className="flex aspect-[54/85.6] w-full flex-col items-center justify-between gap-3 rounded-[20px] bg-brand-800 p-5 text-center text-brand-100">
            <div className="flex w-full items-start justify-between gap-3">
              <Image src="/images/logo-blanc.png" alt="PRIDe" width={34} height={48} className="h-12 w-auto" />
              <span className="text-right text-[11px] leading-snug font-bold tracking-[0.14em]">CARTE<br />DE MEMBRE</span>
            </div>
            {member.photoKey ? (
              // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API, non optimisable par next/image
              <img src={`/api/photo/${member.id}?v=${encodeURIComponent(member.photoKey)}`} alt="Ma photo" className="h-40 w-30 rounded-lg border-[3px] border-white object-cover" />
            ) : (
              <Link href="/membre/profil" className="flex h-40 w-30 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-100/60 text-[13px] leading-tight hover:border-white hover:text-white">
                <UserRound size={30} aria-hidden />
                Ajouter ma photo
              </Link>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-xl leading-tight font-extrabold text-white">{member.lastName}</span>
              <span className="font-display text-[17px] leading-tight font-bold text-white">{member.firstNames}</span>
              <span className="mt-1 text-[13px]">N° {member.number} · {category}</span>
              <span className="text-[13px]">{lastPaid ? `Cotisations à jour jusqu'à ${periodLabel(lastPaid.period)}` : "Aucune cotisation réglée"}</span>
            </div>
            {/* SVG produit par la bibliothèque qrcode à partir d'une adresse du site : aucun texte saisi par un utilisateur. */}
            <div role="img" aria-label="Code QR de vérification de la carte" className="size-21 shrink-0 overflow-hidden rounded-[10px] bg-white [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          {member.status === "ACTIF" &&
            (member.photoKey ? (
              // Simple lien (pas next/link) : c'est un fichier à télécharger, pas une page.
              <a href="/api/carte" download className={cn(buttonVariants(), "w-full")}>
                Télécharger ma carte
              </a>
            ) : (
              <p className="text-center text-sm text-muted">
                Pour télécharger votre carte, <Link href="/membre/profil" className="font-semibold text-brand-600 underline">ajoutez d'abord votre photo</Link>.
              </p>
            ))}
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
          {next && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-[22px]">
              <div className="min-w-0">
                <Eyebrow>{next.type === "FORMATION" ? "Prochaine formation" : "Prochain événement"}</Eyebrow>
                <div className="text-[17px] font-bold">{next.title}</div>
                <div className="text-sm text-muted">{formatDateTime(next.eventAt)}{next.location ? ` · ${next.location}` : ""}</div>
              </div>
              <ButtonLink href={next.type === "FORMATION" ? "/membre/formations" : "/membre/actualites"} variant="outline">Voir</ButtonLink>
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

      <div className="flex flex-wrap gap-5">
        <Card className="flex-[1_1_360px] p-[22px]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-[22px] font-bold">Offres récentes</h2>
            <Link href="/membre/formations?vue=offres" className="text-sm font-semibold text-brand-600">Tout voir</Link>
          </div>
          {offers.length === 0 ? (
            <p className="py-3 text-muted">Aucune offre pour le moment. <Link href="/membre/formations?vue=offres" className="font-semibold text-brand-600">Publier une offre</Link></p>
          ) : (
            <ul className="divide-y divide-line">
              {offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{o.title}</div>
                    {o.location && <div className="text-sm text-muted">{o.location}</div>}
                  </div>
                  <Badge tone={o.type === "BENEVOLAT" ? "yellow" : o.type === "EMPLOI" ? "dark" : "green"}>{OFFER_TYPES[o.type]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex-[1_1_360px] p-[22px]">
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
                    {{ EVENEMENT: "Agenda", ANNONCE: "Annonce", ARTICLE: "Article", FORMATION: "Formation" }[p.type]} · {p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}
                  </div>
                </div>
                {isNew(p.publishedAt) && <Badge tone="red">Nouveau</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

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
