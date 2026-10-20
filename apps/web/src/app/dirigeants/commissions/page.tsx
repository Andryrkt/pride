import Link from "next/link";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { listCommissions } from "@/lib/commissions";
import { formatDate } from "@/lib/utils";

const SOON = 30 * 24 * 60 * 60 * 1000;

export default async function CommissionsPage() {
  const commissions = await listCommissions();
  const vacant = commissions.filter((c) => !c.responsable).length;
  return (
    <>
      <PageTitle title="Commissions" sub={`${commissions.length} commissions · responsables désignés pour un an${vacant ? ` · ${vacant} sans responsable` : ""}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {commissions.map((c) => {
          const r = c.responsable;
          const endsSoon = r?.endsAt && new Date(r.endsAt).getTime() - Date.now() < SOON;
          return (
            <Link key={c.id} href={`/dirigeants/commissions/${c.slug}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-600">
              <Card className="flex h-full flex-col gap-2 hover:border-brand-600">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{c.name}</h2>
                  <Badge tone="gray">{c.memberships.length} membre(s)</Badge>
                </div>
                <p className="text-[15px] text-muted">{c.description}</p>
                <div className="mt-auto pt-2 text-[15px]">
                  {r ? (
                    <>
                      <span className="text-muted">Responsable : </span>
                      <strong>{r.member.lastName} {r.member.firstNames}</strong>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                        jusqu'au {formatDate(r.endsAt)}
                        {endsSoon && <Badge tone="yellow">Mandat bientôt terminé</Badge>}
                      </div>
                    </>
                  ) : (
                    <Badge tone={c.lastMandate ? "red" : "yellow"}>{c.lastMandate ? "Mandat terminé : responsable à désigner" : "Responsable à désigner"}</Badge>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
