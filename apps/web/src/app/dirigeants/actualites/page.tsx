import { and, asc, desc, db, eq, gte, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PublishForm } from "./publish-form";

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ publie?: string }> }) {
  const { publie } = await searchParams;
  const [posts, events] = await Promise.all([
    db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt), limit: 20 }),
    db.query.posts.findMany({
      where: and(eq(schema.posts.type, "EVENEMENT"), gte(schema.posts.eventAt, new Date())),
      orderBy: asc(schema.posts.eventAt),
      with: { registrations: { with: { member: true }, orderBy: asc(schema.eventRegistrations.createdAt) } },
    }),
  ]);
  return (
    <>
      <PageTitle title="Actualités et événements" sub="Publiez une seule fois : vous choisissez qui peut voir le contenu." />
      {publie && <p className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">Publication en ligne.</p>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><PublishForm /></Card>
        <Card>
          <h2 className="mb-2 text-xl font-bold">Publications récentes</h2>
          <ul className="divide-y divide-line">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 py-3">
                <strong>{p.title}</strong>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <Badge tone={p.visibility === "MEMBRES" ? "dark" : "green"}>{p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}</Badge>
                  {formatDate(p.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="mb-1 text-xl font-bold">Inscriptions aux événements à venir</h2>
        <p className="mb-3 text-muted">Membres inscrits depuis leur espace, et visiteurs inscrits depuis l'agenda public (« Je participe »).</p>
        {events.length === 0 && <p className="text-muted">Aucun événement à venir.</p>}
        <div className="flex flex-col gap-3">
          {events.map((ev) => (
            <details key={ev.id} className="rounded-xl border border-line px-4 py-3">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
                {ev.title}
                <span className="text-sm font-normal text-muted">{formatDateTime(ev.eventAt)}</span>
                <Badge tone={ev.registrations.length ? "green" : "gray"}>{ev.registrations.length} inscrit(s)</Badge>
              </summary>
              {ev.registrations.length > 0 && (
                <ul className="mt-2 divide-y divide-line text-[15px]">
                  {ev.registrations.map((r) => (
                    <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>{r.member ? `${r.member.lastName} ${r.member.firstNames}` : r.name}</span>
                      <span className="text-muted">{r.member ? `Membre ${r.member.number}` : <a href={`tel:${r.phone}`} className="text-brand-600">{r.phone}</a>}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </Card>
    </>
  );
}
