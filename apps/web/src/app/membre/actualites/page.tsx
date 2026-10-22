import Link from "next/link";
import { desc, db, eq, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { requireMember } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toggleRegistration } from "../actions";

export default async function MemberNewsPage() {
  const { member } = await requireMember();
  const [posts, regs] = await Promise.all([
    db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt) }),
    db.query.eventRegistrations.findMany({ where: eq(schema.eventRegistrations.memberId, member.id) }),
  ]);
  const registered = new Set(regs.map((r) => r.postId));
  return (
    <>
      <PageTitle title="Actualités" sub="Les nouvelles publiques de PRIDe et les annonces réservées aux membres." />
      {posts.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-start gap-5">
          {p.eventAt && (
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-brand-800 text-white">
              <b className="font-display text-3xl">{p.eventAt.getDate()}</b>
              <span className="text-xs uppercase">{p.eventAt.toLocaleDateString("fr-FR", { month: "short" })}</span>
            </div>
          )}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={p.visibility === "MEMBRES" ? "dark" : "green"}>{p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"}</Badge>
              <span className="text-sm text-muted">{p.eventAt ? formatDateTime(p.eventAt) : formatDate(p.publishedAt)}</span>
            </div>
            <h2 className="text-xl font-bold">{p.title}</h2>
            <p className="text-muted">{p.excerpt}</p>
          </div>
          {p.type === "FORMATION" && (
            <Link href="/membre/formations" className="inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-brand-600 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-50">
              Voir la formation
            </Link>
          )}
          {p.type === "EVENEMENT" && (
            <form action={toggleRegistration.bind(null, p.id)}>
              <button className={`min-h-11 rounded-full px-5 font-semibold ${registered.has(p.id) ? "bg-brand-50 text-brand-800" : "bg-brand-600 text-white"}`}>
                {registered.has(p.id) ? "Inscrit(e) ✓" : "Je m'inscris"}
              </button>
            </form>
          )}
        </Card>
      ))}
    </>
  );
}
