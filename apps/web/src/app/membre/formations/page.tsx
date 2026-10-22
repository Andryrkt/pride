import Link from "next/link";
import { and, asc, desc, db, eq, gte, ne, schema } from "@pride/db";
import { OFFER_TYPES, TARIFS, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { OFFER_STATUS } from "@/lib/network";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { closeOfferAction, interestAction, toggleRegistration } from "../actions";
import { OfferForm, OneClick, ProposalForm } from "../network-forms";

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const OFFER_TONES = { STAGE: "green", EMPLOI: "dark", BENEVOLAT: "yellow" } as const;

export default async function TrainingsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { member } = await requireMember();
  const tab = (await searchParams).vue === "offres" ? "offres" : "formations";

  return (
    <>
      <PageTitle title="Formations et offres" sub="Apprendre, puis transmettre.">
        <nav aria-label="Rubriques" className="flex flex-wrap gap-1.5 rounded-full bg-[#e6eae4] p-1.5">
          {[["formations", "Formations"], ["offres", "Stages et emplois"]].map(([k, label]) => (
            <Link
              key={k}
              href={k === "formations" ? "/membre/formations" : "/membre/formations?vue=offres"}
              aria-current={tab === k ? "page" : undefined}
              className={cn("inline-flex min-h-10 items-center rounded-full px-5 text-[15px] font-semibold", tab === k ? "bg-white text-brand-800 shadow-sm" : "text-[#2b3832]")}
            >
              {label}
            </Link>
          ))}
        </nav>
      </PageTitle>
      {tab === "formations" ? <Trainings memberId={member.id} /> : <Offers memberId={member.id} />}
    </>
  );
}

async function Trainings({ memberId }: { memberId: string }) {
  const trainings = await db.query.posts.findMany({
    where: and(eq(schema.posts.type, "FORMATION"), gte(schema.posts.eventAt, new Date())),
    orderBy: asc(schema.posts.eventAt),
    with: { registrations: true },
  });
  return (
    <div className="flex flex-col gap-3.5">
      {trainings.length === 0 && <Card className="text-muted">Aucune formation programmée pour le moment.</Card>}
      {trainings.map((f) => {
        const registered = f.registrations.some((r) => r.memberId === memberId);
        const left = f.capacity == null ? null : Math.max(0, f.capacity - f.registrations.length);
        return (
          <Card key={f.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 flex-[1_1_360px] items-center gap-4">
              <div className="flex h-18 w-17 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-800 leading-tight text-white">
                <b className="font-display text-[26px]">{f.eventAt!.getDate()}</b>
                <span className="text-xs uppercase">{f.eventAt!.toLocaleDateString("fr-FR", { month: "short" })}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {f.domain && <Badge>{f.domain}</Badge>}
                  <span className="text-[13.5px] text-muted">{left == null ? "Places libres" : left === 0 ? "Complet" : `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`}</span>
                </div>
                <h2 className="text-[19px] font-bold">{f.title}</h2>
                <p className="text-[14.5px] text-muted">{[time.format(f.eventAt!), f.location, f.excerpt].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {registered || left !== 0 ? (
              <form action={toggleRegistration.bind(null, f.id)}>
                <button className={cn("min-h-11 rounded-full px-5 font-semibold", registered ? "bg-brand-50 text-brand-800" : "bg-brand-600 text-white hover:bg-brand-800")}>
                  {registered ? "Inscrit(e) ✓" : "S'inscrire"}
                </button>
              </form>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-full bg-[#ecefea] px-5 font-semibold text-muted">Complet</span>
            )}
          </Card>
        );
      })}
      {trainings.some((f) => f.registrations.some((r) => r.memberId === memberId)) && (
        <p className="text-sm text-muted">Pour vous désinscrire, cliquez à nouveau sur « Inscrit(e) ✓ ».</p>
      )}
      <Card className="flex flex-col gap-3.5 border-brand-800 bg-brand-800 text-brand-100">
        <div>
          <h2 className="text-[22px] font-bold text-white">Vous avez un savoir-faire à partager ?</h2>
          <p>Proposez d'animer un atelier. La Commission formation et projets vous recontacte.</p>
        </div>
        <ProposalForm kind="ATELIER" openLabel="Proposer un atelier" dark />
      </Card>
    </div>
  );
}

async function Offers({ memberId }: { memberId: string }) {
  const [published, mine] = await Promise.all([
    db.query.offers.findMany({ where: eq(schema.offers.status, "PUBLIEE"), orderBy: desc(schema.offers.createdAt), with: { author: true, interests: true } }),
    db.query.offers.findMany({ where: and(eq(schema.offers.authorId, memberId), ne(schema.offers.status, "PUBLIEE")), orderBy: desc(schema.offers.createdAt), limit: 5 }),
  ]);
  return (
    <div className="flex flex-col gap-3.5">
      {published.length === 0 && <Card className="text-muted">Aucune offre publiée pour le moment.</Card>}
      {published.map((o) => {
        const isMine = o.authorId === memberId;
        const interested = o.interests.some((i) => i.memberId === memberId);
        return (
          <Card key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={OFFER_TONES[o.type]}>{OFFER_TYPES[o.type]}</Badge>
                <span className="text-[13.5px] text-muted">
                  {isMine ? `Votre offre · ${o.interests.length} membre(s) intéressé(s)` : `Publiée par un ${TARIFS[o.author.category as MemberCategory].label.toLowerCase()}`}
                </span>
              </div>
              <h2 className="text-[19px] font-bold">{o.title}</h2>
              <p className="text-[14.5px] whitespace-pre-line text-muted">{[o.location, o.description].filter(Boolean).join(" · ")}</p>
            </div>
            {isMine ? (
              <OneClick action={closeOfferAction.bind(null, o.id)} label="Clôturer l'offre" doneLabel="Offre clôturée" />
            ) : interested ? (
              <span className="inline-flex min-h-11 items-center rounded-full bg-brand-50 px-5 font-semibold text-brand-800">Candidature envoyée ✓</span>
            ) : (
              <OneClick action={interestAction.bind(null, o.id)} label="Je suis intéressé(e)" doneLabel="Candidature envoyée ✓" />
            )}
          </Card>
        );
      })}
      {mine.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold">Mes offres proposées</h2>
          <ul className="divide-y divide-line">
            {mine.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{o.title}{o.decisionNote ? <span className="text-muted"> · {o.decisionNote}</span> : null}</span>
                <Badge tone={OFFER_STATUS[o.status][1]}>{OFFER_STATUS[o.status][0]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-[19px] font-bold">Une offre dans votre entreprise ?</h2>
          <p className="text-[14.5px] text-muted">Partagez-la avec le réseau : créer des opportunités pour les autres, c'est aussi ça PRIDe. Elle sera publiée après validation par un dirigeant.</p>
        </div>
        <OfferForm />
      </Card>
    </div>
  );
}
