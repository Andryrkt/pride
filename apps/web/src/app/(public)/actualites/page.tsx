import Image from "next/image";
import Link from "next/link";
import { and, desc, db, eq, gte, schema } from "@pride/db";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { EventRegistration } from "./event-registration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Actualités et événements" };

const TABS = [
  ["tout", "Tout"],
  ["agenda", "Agenda"],
  ["articles", "Articles"],
] as const;

export default async function ActualitesPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const tab = TABS.some(([k]) => k === vue) ? vue : "tout";
  const now = new Date();
  const [events, articles] = await Promise.all([
    db.query.posts.findMany({
      where: and(eq(schema.posts.visibility, "PUBLIC"), eq(schema.posts.type, "EVENEMENT"), gte(schema.posts.eventAt, now)),
      orderBy: schema.posts.eventAt,
    }),
    db.query.posts.findMany({
      where: and(eq(schema.posts.visibility, "PUBLIC"), eq(schema.posts.type, "ARTICLE")),
      orderBy: desc(schema.posts.publishedAt),
    }),
  ]);
  return (
    <>
      <PageHero
        eyebrow="Actualités et événements"
        title="La vie de PRIDe, au fil des jours"
        aside={
          <nav aria-label="Rubriques" className="flex flex-wrap gap-1.5 self-end rounded-full bg-[#e6eae4] p-1.5">
            {TABS.map(([k, label]) => (
              <Link
                key={k}
                href={k === "tout" ? "/actualites" : `/actualites?vue=${k}`}
                aria-current={tab === k ? "page" : undefined}
                className={cn("inline-flex min-h-10 items-center rounded-full px-5 text-[15px] font-semibold", tab === k ? "bg-white text-brand-800 shadow-sm" : "text-[#2b3832]")}
              >
                {label}
              </Link>
            ))}
          </nav>
        }
      >
        Nos prochains rendez-vous et les dernières nouvelles de l'association.
      </PageHero>
      {tab !== "articles" && (
        <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-extrabold">Agenda</h2>
          {events.length === 0 && <p className="text-muted">Aucun événement public programmé pour le moment.</p>}
          {events.map((e) => (
            <Card key={e.id} className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-brand-800 text-white">
                <b className="font-display text-3xl">{e.eventAt!.getDate()}</b>
                <span className="text-xs uppercase">{e.eventAt!.toLocaleDateString("fr-FR", { month: "short" })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <Badge>Ouvert au public</Badge>
                <h3 className="mt-1 text-xl font-bold">
                  <Link href={`/actualites/${e.slug}`} className="hover:text-brand-600">{e.title}</Link>
                </h3>
                <p className="text-muted">{formatDateTime(e.eventAt)} · {e.location}</p>
              </div>
              <EventRegistration postId={e.id} />
            </Card>
          ))}
        </section>
      )}
      {tab !== "agenda" && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-6 text-3xl font-extrabold">Articles</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <Link key={a.id} href={`/actualites/${a.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                  {a.imageUrl ? (
                    <Image src={a.imageUrl} alt="" width={600} height={400} className="h-48 w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-48 items-end bg-brand-800 p-5 font-display text-2xl font-extrabold text-white">{a.title}</div>
                  )}
                  <div className="flex flex-col gap-2 p-5">
                    <span className="text-sm text-muted">{formatDate(a.publishedAt)}</span>
                    <h3 className="text-xl font-bold group-hover:text-brand-600">{a.title}</h3>
                    <p className="text-[15px] text-muted">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-2">
            <h2 className="text-3xl font-extrabold text-white">Ne manquez aucun rendez-vous</h2>
            <p className="text-[17px] text-brand-100">Devenez membre pour recevoir les invitations aux formations et aux événements.</p>
          </div>
          <ButtonLink href="/adhesion" variant="white">Devenir membre</ButtonLink>
        </div>
      </section>
    </>
  );
}
