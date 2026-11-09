import { and, desc, db, eq, schema } from "@pride/db";
import { Badge } from "@/components/ui/card";
import { PROPOSAL_STATUS } from "@/lib/network";
import { cn, formatDate } from "@/lib/utils";

/** Suivi des propositions du membre (ateliers ou idées de projet) : état et réponse des dirigeants. */
export async function MyProposals({ memberId, kind, dark }: { memberId: string; kind: "ATELIER" | "PROJET"; dark?: boolean }) {
  const mine = await db.query.proposals.findMany({
    where: and(eq(schema.proposals.memberId, memberId), eq(schema.proposals.kind, kind)),
    orderBy: desc(schema.proposals.createdAt),
    limit: 5,
  });
  if (!mine.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn("font-bold", dark && "text-white")}>Mes propositions</h3>
      <ul className={cn("divide-y", dark ? "divide-white/20" : "divide-line")}>
        {mine.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="font-semibold">{p.title}</div>
              <div className={cn("text-sm", dark ? "text-brand-100/80" : "text-muted")}>
                Envoyée le {formatDate(p.createdAt)}{p.decisionNote ? ` · « ${p.decisionNote} »` : ""}
              </div>
            </div>
            <Badge tone={PROPOSAL_STATUS[p.status][1]}>{PROPOSAL_STATUS[p.status][0]}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
